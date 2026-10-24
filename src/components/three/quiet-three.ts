import { setConsoleFunction } from "three";

/*
  @react-three/fiber (9.8.2, the latest) still creates a THREE.Clock, which three.js r186 reports as deprecated on
  every page with a 3D scene. That one notice is not ours to fix, so it is dropped here; every other three.js
  message is passed on unchanged. Remove this file once fiber switches to THREE.Timer.
*/
const LIBRARY_NOTICE = "THREE.Clock: This module has been deprecated";

setConsoleFunction((type: string, message: string, ...params: unknown[]) => {
  if (typeof message === "string" && message.startsWith(LIBRARY_NOTICE)) return;
  const log = type === "error" ? console.error : type === "warn" ? console.warn : console.log;
  log(message, ...params);
});
