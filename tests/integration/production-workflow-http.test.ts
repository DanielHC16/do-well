import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { loadLocalSupabaseEnvironment } from "../../scripts/local-supabase-env.cjs";

const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  user: z.object({ id: z.string().uuid() }),
});

type LocalEnvironment = Awaited<
  ReturnType<typeof loadLocalSupabaseEnvironment>
>;

type Session = z.infer<typeof sessionSchema>;

function publicHeaders(environment: LocalEnvironment, accessToken?: string) {
  return {
    apikey: environment.publishableKey,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function adminHeaders(environment: LocalEnvironment) {
  return {
    apikey: environment.serviceRoleKey,
    Authorization: `Bearer ${environment.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function readJson(
  response: Response,
  operation: string,
): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    const contentType = response.headers.get("content-type") ?? "missing";
    throw new Error(
      `${operation} returned non-JSON HTTP ${response.status} (${contentType})`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `${operation} failed with HTTP ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return body;
}

async function signUp(
  environment: LocalEnvironment,
  email: string,
  password: string,
): Promise<Session> {
  const response = await fetch(`${environment.apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: publicHeaders(environment),
    body: JSON.stringify({ email, password }),
  });

  return sessionSchema.parse(await readJson(response, "signup"));
}

async function deleteUser(
  environment: LocalEnvironment,
  userId: string,
): Promise<void> {
  const response = await fetch(
    `${environment.apiUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: adminHeaders(environment) },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`fixture cleanup failed with HTTP ${response.status}`);
  }
}

async function cleanupEntities(
  environment: LocalEnvironment,
  {
    gigId,
    assignmentId,
    reportId,
    userIds = [],
  }: {
    gigId?: string;
    assignmentId?: string;
    reportId?: string;
    userIds?: string[];
  },
): Promise<void> {
  const headers = adminHeaders(environment);

  if (reportId) {
    await fetch(
      `${environment.apiUrl}/rest/v1/admin_actions?report_id=eq.${encodeURIComponent(reportId)}`,
      { method: "DELETE", headers },
    );
    await fetch(
      `${environment.apiUrl}/rest/v1/reports?id=eq.${encodeURIComponent(reportId)}`,
      { method: "DELETE", headers },
    );
  }

  if (assignmentId) {
    await fetch(
      `${environment.apiUrl}/rest/v1/submission_files?assignment_id=eq.${encodeURIComponent(assignmentId)}`,
      { method: "DELETE", headers },
    );
    await fetch(
      `${environment.apiUrl}/rest/v1/submissions?assignment_id=eq.${encodeURIComponent(assignmentId)}`,
      { method: "DELETE", headers },
    );
    await fetch(
      `${environment.apiUrl}/rest/v1/assignment_milestones?assignment_id=eq.${encodeURIComponent(assignmentId)}`,
      { method: "DELETE", headers },
    );
  }

  if (gigId) {
    await fetch(
      `${environment.apiUrl}/rest/v1/assignments?gig_id=eq.${encodeURIComponent(gigId)}`,
      { method: "DELETE", headers },
    );
    await fetch(
      `${environment.apiUrl}/rest/v1/applications?gig_id=eq.${encodeURIComponent(gigId)}`,
      { method: "DELETE", headers },
    );
    await fetch(
      `${environment.apiUrl}/rest/v1/gigs?id=eq.${encodeURIComponent(gigId)}`,
      { method: "DELETE", headers },
    );
  }

  for (const userId of userIds) {
    await fetch(
      `${environment.apiUrl}/rest/v1/account_roles?user_id=eq.${encodeURIComponent(userId)}`,
      { method: "DELETE", headers },
    );
    await fetch(
      `${environment.apiUrl}/rest/v1/activity_events?recipient_id=eq.${encodeURIComponent(userId)}`,
      { method: "DELETE", headers },
    );
    await fetch(
      `${environment.apiUrl}/rest/v1/activity_events?actor_id=eq.${encodeURIComponent(userId)}`,
      { method: "DELETE", headers },
    );
    await deleteUser(environment, userId);
  }
}

describe("Production Marketplace Multi-Principal Workflow over HTTP", () => {
  it("executes full two-principal lifecycle: gig, apply, select, confirm, milestone, evidence upload, approval, and admin reporting", async () => {
    const environment = await loadLocalSupabaseEnvironment();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const password = `Pass-${suffix}-Aa1!`;
    const createdUserIds: string[] = [];
    let createdGigId: string | undefined;
    let createdAssignmentId: string | undefined;
    let createdReportId: string | undefined;

    try {
      // 1. Sign up Employer A and Worker B
      const employer = await signUp(
        environment,
        `employer-${suffix}@example.test`,
        password,
      );
      createdUserIds.push(employer.user.id);

      const worker = await signUp(
        environment,
        `worker-${suffix}@example.test`,
        password,
      );
      createdUserIds.push(worker.user.id);

      // 2. Onboard both users
      const employerOnboard = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/complete_onboarding`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: JSON.stringify({
            p_display_name: "Employer Juan",
            p_home_area: "Sampaloc, Manila",
            p_preferred_mode: "employer",
          }),
        },
      );
      expect(employerOnboard.status).toBe(200);

      const workerOnboard = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/complete_onboarding`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({
            p_display_name: "Worker Maria",
            p_home_area: "Sampaloc, Manila",
            p_preferred_mode: "worker",
          }),
        },
      );
      expect(workerOnboard.status).toBe(200);

      // 3. Employer creates a draft gig and publishes it
      const createGigRes = await fetch(`${environment.apiUrl}/rest/v1/gigs`, {
        method: "POST",
        headers: {
          ...publicHeaders(environment, employer.access_token),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          employer_id: employer.user.id,
          title: "Fix Kitchen Water Pipe",
          description: "Leaking joint under kitchen counter.",
          category: "errands",
          work_mode: "onsite",
          budget_amount: 1000,
          currency: "PHP",
          public_area: "Sampaloc, Manila",
          public_latitude: 14.6091,
          public_longitude: 120.9899,
        }),
      });
      const createdGigs = (await readJson(
        createGigRes,
        "create gig",
      )) as Array<{
        id: string;
      }>;
      const gigId = createdGigs[0].id;
      createdGigId = gigId;

      const publishRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/publish_gig`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: JSON.stringify({ p_gig_id: gigId }),
        },
      );
      expect(publishRes.status).toBe(200);

      // 4. Worker discovers the gig via discover_gigs RPC
      const discoverRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/discover_gigs`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({
            p_worker_lat: 14.6091,
            p_worker_lng: 120.9899,
            p_max_distance_km: 25,
          }),
        },
      );
      const discoveredGigs = (await readJson(
        discoverRes,
        "discover gigs",
      )) as Array<{ id: string; title: string }>;
      expect(discoveredGigs.some((g) => g.id === gigId)).toBe(true);

      // 5. Worker applies to the gig
      const applyRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/apply_to_gig`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({
            p_gig_id: gigId,
            p_message: "Experienced plumber available today.",
          }),
        },
      );
      const application = (await readJson(applyRes, "apply to gig")) as {
        id: string;
        status: string;
      };
      expect(application.status).toBe("pending");

      // 6. Employer selects Worker atomically
      const selectRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/select_worker_atomic`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: JSON.stringify({ p_application_id: application.id }),
        },
      );
      const assignment = (await readJson(selectRes, "select worker")) as {
        id: string;
        status: string;
        agreed_amount: number;
      };
      createdAssignmentId = assignment.id;
      expect(assignment.status).toBe("proposed");
      expect(assignment.agreed_amount).toBe(1000);

      // 7. Worker confirms the assignment
      const confirmRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/confirm_assignment`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({ p_assignment_id: assignment.id }),
        },
      );
      const confirmedAssignment = (await readJson(
        confirmRes,
        "confirm assignment",
      )) as { status: string; worker_confirmed_at: string | null };
      expect(confirmedAssignment.status).toBe("active");
      expect(confirmedAssignment.worker_confirmed_at).not.toBeNull();

      // 8. Employer creates an assignment milestone
      const milestoneRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/create_assignment_milestone`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: JSON.stringify({
            p_assignment_id: assignment.id,
            p_title: "Inspect joint and replace seal",
            p_description: "Check for any active dripping.",
          }),
        },
      );
      const milestone = (await readJson(milestoneRes, "create milestone")) as {
        id: string;
        status: string;
      };
      expect(milestone.status).toBe("pending");

      // 9. Worker starts the milestone
      const startMilestoneRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/start_assignment_milestone`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({ p_milestone_id: milestone.id }),
        },
      );
      const startedMilestone = (await readJson(
        startMilestoneRes,
        "start milestone",
      )) as { status: string };
      expect(startedMilestone.status).toBe("in_progress");

      // 10. Worker begins submission, uploads evidence to Storage, and finalizes
      const beginSubRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/begin_submission`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({
            p_assignment_id: assignment.id,
            p_milestone_id: milestone.id,
            p_note: "Replaced seal. No more water leak.",
          }),
        },
      );
      const submissionRaw = await readJson(beginSubRes, "begin submission");
      const submission = (
        Array.isArray(submissionRaw) ? submissionRaw[0] : submissionRaw
      ) as { id: string; status: string };
      expect(submission.status).toBe("pending_upload");

      // Upload test JPEG blob into submission-evidence storage bucket
      const testFileId = "44444444-4444-4444-8444-444444444444";
      const storageObjectPath = `${worker.user.id}/${assignment.id}/${submission.id}/${testFileId}.jpg`;
      const testImageBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
        0x00, 0xbf, 0x00, 0xff, 0xd9,
      ]);

      const workerSupabase = createClient(
        environment.apiUrl,
        environment.publishableKey,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: { Authorization: `Bearer ${worker.access_token}` },
          },
        },
      );

      const imageArrayBuffer = testImageBytes.buffer.slice(
        testImageBytes.byteOffset,
        testImageBytes.byteOffset + testImageBytes.byteLength,
      );

      const { data: uploadData, error: uploadError } =
        await workerSupabase.storage
          .from("submission-evidence")
          .upload(storageObjectPath, imageArrayBuffer, {
            contentType: "image/jpeg",
            upsert: false,
          });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      expect(uploadData?.path).toBe(storageObjectPath);

      // Finalize submission with evidence manifest
      const finalizeRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/finalize_submission`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({
            p_submission_id: submission.id,
            p_files: [
              {
                object_path: storageObjectPath,
                media_type: "image/jpeg",
                size_bytes: testImageBytes.length,
              },
            ],
          }),
        },
      );
      const finalizedSubmission = (await readJson(
        finalizeRes,
        "finalize submission",
      )) as { status: string };
      expect(finalizedSubmission.status).toBe("submitted");

      // 11. Employer approves work completion
      const approveRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/approve_assignment_completion`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: JSON.stringify({
            p_submission_id: submission.id,
            p_review_note: "Verified work is satisfactory.",
          }),
        },
      );
      expect(approveRes.status).toBe(200);

      // Verify assignment completed
      const assignmentRes = await fetch(
        `${environment.apiUrl}/rest/v1/assignments?id=eq.${encodeURIComponent(assignment.id)}&select=status`,
        {
          headers: publicHeaders(environment, employer.access_token),
        },
      );
      const assignmentRows = (await readJson(
        assignmentRes,
        "read assignment",
      )) as Array<{ status: string }>;
      expect(assignmentRows[0].status).toBe("completed");

      // 12. Worker submits a report
      const reportRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/submit_report`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({
            p_category: "other",
            p_details: "Feedback regarding assignment completion clarity.",
            p_gig_id: gigId,
            p_assignment_id: assignment.id,
          }),
        },
      );
      const createdReport = (await readJson(reportRes, "submit report")) as {
        id: string;
        status: string;
      };
      createdReportId = createdReport.id;
      expect(createdReport.status).toBe("open");

      // 13. Employer is granted admin role server-side
      const roleRes = await fetch(
        `${environment.apiUrl}/rest/v1/account_roles`,
        {
          method: "POST",
          headers: {
            ...adminHeaders(environment),
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            user_id: employer.user.id,
            role: "admin",
            granted_by: employer.user.id,
          }),
        },
      );
      if (roleRes.status !== 201) {
        const err = await roleRes.text();
        throw new Error(`Role insert failed HTTP ${roleRes.status}: ${err}`);
      }
      expect(roleRes.status).toBe(201);

      // Employer checks capability
      const capRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/get_my_capabilities`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: "{}",
        },
      );
      const capabilities = (await readJson(
        capRes,
        "get my capabilities",
      )) as Array<{ is_admin: boolean }>;
      expect(capabilities[0].is_admin).toBe(true);

      // Employer accesses admin reports queue
      const adminReportsRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/list_admin_reports`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: JSON.stringify({ p_status: "open" }),
        },
      );
      const adminReports = (await readJson(
        adminReportsRes,
        "list admin reports",
      )) as Array<{ id: string }>;
      expect(adminReports.some((r) => r.id === createdReport.id)).toBe(true);

      // Employer resolves the report
      const resolveReportRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/resolve_report`,
        {
          method: "POST",
          headers: publicHeaders(environment, employer.access_token),
          body: JSON.stringify({
            p_report_id: createdReport.id,
            p_decision: "resolved",
            p_resolution_note: "Review completed by admin.",
          }),
        },
      );
      const resolvedReport = (await readJson(
        resolveReportRes,
        "resolve report",
      )) as { status: string; resolution_note: string | null };
      expect(resolvedReport.status).toBe("resolved");
      expect(resolvedReport.resolution_note).toBe("Review completed by admin.");

      // 14. Negative security check: Worker (non-admin) calling list_admin_reports fails
      const nonAdminRes = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/list_admin_reports`,
        {
          method: "POST",
          headers: publicHeaders(environment, worker.access_token),
          body: JSON.stringify({ p_status: "open" }),
        },
      );
      expect(nonAdminRes.status).toBeGreaterThanOrEqual(400);
    } finally {
      await cleanupEntities(environment, {
        gigId: createdGigId,
        assignmentId: createdAssignmentId,
        reportId: createdReportId,
        userIds: createdUserIds,
      });
    }
  });
});
