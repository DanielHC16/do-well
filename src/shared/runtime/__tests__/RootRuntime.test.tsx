import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { DemoProvider } from "@/features/demo/context/DemoProvider";

import { RootRuntime } from "../RootRuntime";

jest.mock("@/features/auth/context/AuthProvider", () => ({
  AuthProvider: jest.fn(({ children }: React.PropsWithChildren) => children),
}));

jest.mock("@/features/demo/context/DemoProvider", () => ({
  DemoProvider: jest.fn(({ children }: React.PropsWithChildren) => children),
}));

const mockedAuthProvider = jest.mocked(AuthProvider);
const mockedDemoProvider = jest.mocked(DemoProvider);

describe("RootRuntime", () => {
  const originalRuntime = process.env.EXPO_PUBLIC_APP_RUNTIME;

  afterEach(() => {
    process.env.EXPO_PUBLIC_APP_RUNTIME = originalRuntime;
    jest.clearAllMocks();
  });

  it("renders demo without constructing the production provider", async () => {
    process.env.EXPO_PUBLIC_APP_RUNTIME = "demo";

    const view = await render(
      <RootRuntime>
        <Text>runtime child</Text>
      </RootRuntime>,
    );

    expect(view.getByText("runtime child")).toBeVisible();
    expect(mockedDemoProvider).toHaveBeenCalledTimes(1);
    expect(mockedAuthProvider).not.toHaveBeenCalled();
  });

  it("keeps production on the existing authentication provider", async () => {
    process.env.EXPO_PUBLIC_APP_RUNTIME = "production";

    const view = await render(
      <RootRuntime>
        <Text>runtime child</Text>
      </RootRuntime>,
    );

    expect(view.getByText("runtime child")).toBeVisible();
    expect(mockedAuthProvider).toHaveBeenCalledTimes(1);
    expect(mockedDemoProvider).not.toHaveBeenCalled();
  });
});
