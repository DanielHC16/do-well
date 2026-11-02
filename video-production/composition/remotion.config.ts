/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
Config.setPublicDir('../public');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setConcurrency(2);
// Bound decoded-frame caching on this 16GB Windows production machine.
Config.setOffthreadVideoCacheSizeInBytes(256 * 1024 * 1024);
