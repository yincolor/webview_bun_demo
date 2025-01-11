import { dlopen, FFIType, ptr } from "bun:ffi";
import { Webview } from "./webview";

import libwebview_win from "./lib/libwebview.dll" with {type:"file"};
import libwebview_linux_arm64 from "./lib/libwebview-arm64.so" with {type:"file"};
import libwebview_linux_x64 from "./lib/libwebview-x64.so" with {type:"file"};

Bun.file(libwebview_win);
Bun.file(libwebview_linux_arm64);
Bun.file(libwebview_linux_x64);

/**
 * 
 * @param {string} value 
 * @returns 
 */
export function encodeCString(value) {
    return ptr(new TextEncoder().encode(value + "\0"));
}

/**
 * 窗口实例列表
 * @type {Webview[]}
 */
export const instances = [];

/**
 * Unload the library and destroy all webview instances. Should only be run
 * once all windows are closed.
 */
export function unload() {
    for (const instance of instances) instance.destroy();
    lib.close();
}

let lib_file;
// console.log(`process.env.WEBVIEW_PATH = ${process.env.WEBVIEW_PATH}`);
// console.log(`process.platform = ${process.platform}`);

if (process.env.WEBVIEW_PATH) {
    lib_file = await import(process.env.WEBVIEW_PATH);
} else if (process.platform === "win32") {
    //@ts-expect-error
    lib_file = await import("./lib/libwebview.dll");
} else if (process.platform === "linux") {
    lib_file = await import(`./lib/libwebview-${process.arch}.so`);
} else {
    throw `unsupported platform: ${process.platform}-${process.arch}`;
}

export const lib = dlopen(lib_file.default, {
    webview_create: {
        args: [FFIType.i32, FFIType.ptr],
        returns: FFIType.ptr
    },
    webview_destroy: {
        args: [FFIType.ptr],
        returns: FFIType.void
    },
    webview_run: {
        args: [FFIType.ptr],
        returns: FFIType.void
    },
    webview_terminate: {
        args: [FFIType.ptr],
        returns: FFIType.void
    },
    webview_get_window: {
        args: [FFIType.ptr],
        returns: FFIType.ptr
    },
    webview_set_title: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.void
    },
    webview_set_size: {
        args: [FFIType.ptr, FFIType.i32, FFIType.i32, FFIType.i32],
        returns: FFIType.void
    },
    webview_navigate: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.void
    },
    webview_set_html: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.void
    },
    webview_init: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.void
    },
    webview_eval: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.void
    },
    webview_bind: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.function, FFIType.ptr],
        returns: FFIType.void
    },
    webview_unbind: {
        args: [FFIType.ptr, FFIType.ptr],
        returns: FFIType.void
    },
    webview_return: {
        args: [FFIType.ptr, FFIType.ptr, FFIType.i32, FFIType.ptr],
        returns: FFIType.void
    }
});