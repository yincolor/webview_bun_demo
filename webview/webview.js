import { CString, FFIType, JSCallback } from "bun:ffi";
import { encodeCString, instances, lib } from "./ffi.js";

/** 窗口尺寸 */
// export interface Size {
//     /** The width of the window */
//     width: number,
//     /** The height of the window */
//     height: number,
//     /** The window size hint */
//     hint: SizeHint,
// }

/** 窗口尺寸约束 */
export const SizeHint = {
    /** 宽度和高度是默认大小，没有特定的大小限制或建议，窗口将使用其默认大小 */
    NONE: 1,
    /** 宽度和高度是最小边界，指定的宽度和高度值将作为窗口的最小尺寸。窗口可以比这个大，但不能比这个小。 */
    MIN: 2,
    /** 宽度和高度是最大边界，指定的宽度和高度值将作为窗口的最大尺寸。窗口可以比这个小，但不能比这个大。 */
    MAX: 3,
    /** 窗口大小不能由用户更改，窗口的大小将被固定，用户无法通过拖动窗口边缘来改变它的大小 */
    FIXED: 4
};

/** An instance of a webview window.*/
export class Webview {
    /** @type {Pointer | null} */
    #handle = null;
    /** @type { Map<string, JSCallback> } */
    #callbacks = new Map();

    /** **UNSAFE**: Highly unsafe API, beware!
     *
     * An unsafe pointer to the webview
     */
    get unsafeHandle() {
        return this.#handle;
    }

    /** **UNSAFE**: Highly unsafe API, beware!
     *
     * 这是一个指向特定于平台的原生窗口句柄的不安全指针，用于webview。
     * 当使用GTK后端时，该指针是GtkWindow指针；
     * 当使用Cocoa后端时，该指针是NSWindow指针；
     * 当使用Win32后端时，该指针是HWND指针。

     */
    get unsafeWindowHandle() {
        return lib.symbols.webview_get_window(this.#handle);
    }

    /**
     * Sets the native window size
     *
     * ## Example
     *
     * ```ts
     * import { Webview, SizeHint } from "webview-bun";
     *
     * const webview = new Webview();
     * webview.navigate("https://bun.sh/");
     *
     * // Change from the default size to a small fixed window
     * webview.size = {
     *   width: 200,
     *   height: 200,
     *   hint: SizeHint.FIXED
     * };
     *
     * webview.run();
     * ```
     */
    set size({ width, height, hint }) {
        //@ts-ignore
        lib.symbols.webview_set_size(this.#handle, width, height, hint);
    }

    /**
     * Sets the native window title
     *
     * ## Example
     *
     * ```ts
     * import { Webview } from "webview-bun";
     *
     * const webview = new Webview();
     * webview.navigate("https://bun.sh/");
     *
     * // Set the window title to "Hello world!"
     * webview.title = "Hello world!";
     *
     * webview.run();
     * ```
     * 
     * @param {string} title
     */
    set title(title) {
        lib.symbols.webview_set_title(this.#handle, encodeCString(title));
    }

    /** **UNSAFE**: Highly unsafe API, beware!
     *
     * Creates a new webview instance from a webview handle.
     *
     * @param handle A previously created webview instances handle
     */
    // constructor(handle: Pointer); // 签名声明，不使用了

    /**
     * Creates a new webview instance.
     *
     * ## Example
     *
     * ```ts
     * import { Webview, SizeHint } from "webview-bun";
     *
     * // Create a new webview and change from the default size to a small fixed window
     * const webview = new Webview(true, {
     *   width: 200,
     *   height: 200,
     *   hint: SizeHint.FIXED
     * });
     *
     * webview.navigate("https://bun.sh/");
     * webview.run();
     * ```
     *
     * @param debug Defaults to false, when true developer tools are enabled
     * for supported platforms
     * @param size The window size, default to 1024x768 with no size hint. Set
     * this to undefined if you do not want to automatically resize the window.
     * This may cause issues for MacOS where the window is invisible until
     * resized.
     * @param window **UNSAFE**: Highly unsafe API, beware! An unsafe pointer to
     * the platforms specific native window handle. If null or undefined a new
     * window is created. If it's non-null - then child WebView is embedded into
     * the given parent window. Otherwise a new window is created. Depending on
     * the platform, a `GtkWindow`, `NSWindow` or `HWND` pointer can be passed
     * here.
     */
    // constructor(debug?: boolean, size?: Size, window?: Pointer | null);

    /**
     * 
     * @param {boolean | Pointer} debugOrHandle 
     * @param {Size | undefined } size 
     * @param {Pointer | null} window 
     */
    constructor(
        debugOrHandle = false,
        size = { width: 1024, height: 768, hint: SizeHint.NONE },
        window = null,
    ) {
        this.#handle = typeof debugOrHandle === "bigint" || typeof debugOrHandle === "number"
            ? debugOrHandle
            : lib.symbols.webview_create(Number(debugOrHandle), window);
        if (size !== undefined) this.size = size;
        instances.push(this);
    }

    /**
     * Destroys the webview and closes the window along with freeing all internal
     * resources.
     */
    destroy() {
        for (const callback of this.#callbacks.keys()) this.unbind(callback);
        lib.symbols.webview_terminate(this.#handle);
        lib.symbols.webview_destroy(this.#handle);
        this.#handle = null;
    }

    /**
     * Navigates webview to the given URL. URL may be a data URI, i.e.
     * `"data:text/html,<html>...</html>"`. It is often ok not to url-encodeCString it
     * properly, webview will re-encodeCString it for you.
     * @param {String} url 
     */
    navigate(url) {
        lib.symbols.webview_navigate(this.#handle, encodeCString(url));
    }

    /**
     * Sets the current HTML of the webview to the given html string.
     * @param {String} html
     */
    setHTML(html) {
        lib.symbols.webview_set_html(this.#handle, encodeCString(html));
    }

    /**
     * Runs the main event loop until it's terminated. After this function exits
     * the webview is automatically destroyed.
     */
    run() {
        lib.symbols.webview_run(this.#handle);
        this.destroy();
    }

    /**
     * Binds a callback so that it will appear in the webview with the given name
     * as a global async JavaScript function. Callback receives a seq and req value.
     * The seq parameter is an identifier for using {@link Webview.return} to
     * return a value while the req parameter is a string of an JSON array representing
     * the arguments passed from the JavaScript function call.
     *
     * @param {string} name The name of the bound function
     * @param {(seq: string, req: string, arg: Pointer | null) => void} callback A callback which takes two strings as parameters: `seq`
     * and `req` and the passed {@link arg} pointer
     * @param {Pointer | null} arg A pointer which is going to be passed to the callback once called
     */
    bindRaw(name, callback, arg = null,) {

        const callbackResource = new JSCallback(
            /**
             * 
             * @param {Pointer} seqPtr 
             * @param {Pointer} reqPtr 
             * @param {Pointer | null} arg 
             */
            (seqPtr, reqPtr, arg) => {
                const seq = seqPtr ? new CString(seqPtr) : "";
                const req = reqPtr ? new CString(reqPtr) : "";
                //@ts-ignore
                callback(seq, req, arg);
            },
            {
                args: [FFIType.pointer, FFIType.pointer, FFIType.pointer],
                returns: FFIType.void
            }
        );


        this.#callbacks.set(name, callbackResource);
        lib.symbols.webview_bind(
            this.#handle,
            encodeCString(name),
            callbackResource.ptr,
            arg
        );
    }

    /**
     * Binds a callback so that it will appear in the webview with the given name
     * as a global async JavaScript function. Callback arguments are automatically
     * converted from json to as closely as possible match the arguments in the
     * webview context and the callback automatically converts and returns the
     * return value to the webview.
     *
     * @param {string} name The name of the bound function
     * @param {(...args: any) => any} callback A callback which is passed the arguments as called from the
     * webview JavaScript environment and optionally returns a value to the
     * webview JavaScript caller
     *
     * ## Example
     * ```ts
     * import { Webview } from "webview-bun";
     *
     * const html = `
     *   <html>
     *   <body>
     *     <h1>Hello from bun v${Bun.version}</h1>
     *     <button onclick="press('I was pressed!', 123, new Date()).then(log);">
     *       Press me!
     *     </button>
     *   </body>
     *   </html>
     * `;
     *
     * const webview = new Webview();
     *
     * webview.navigate(`data:text/html,${encodeURIComponent(html)}`);
     *
     * let counter = 0;
     * // Create and bind `press` to the webview javascript instance.
     * // This functions in addition to logging its parameters also returns
     * // a value from bun to webview.
     * webview.bind("press", (a, b, c) => {
     *   console.log(a, b, c);
     *
     *   return { times: counter++ };
     * });
     *
     * // Bind the `log` function in the webview to the parent instances `console.log`
     * webview.bind("log", (...args) => console.log(...args));
     *
     * webview.run();
     * ```
     */
    bind(name, callback) {
        this.bindRaw(name, (seq, req) => {
            const args = JSON.parse(req);
            let result;
            /** @type {boolean} */
            let success;
            try {
                result = callback(...args);
                success = true;
            } catch (err) {
                result = err;
                success = false;
            }
            if (result instanceof Promise) {
                result.then(r => this.return(seq, success ? 0 : 1, JSON.stringify(r)));
            } else {
                this.return(seq, success ? 0 : 1, JSON.stringify(result));
            }
        });
    }

    /**
     * Unbinds a previously bound function freeing its resource and removing it
     * from the webview JavaScript context.
     *
     * @param {string} name The name of the bound function
     */
    unbind(name) {
        //@ts-ignore
        lib.symbols.webview_unbind(this.#handle, encodeCString(name));
        this.#callbacks.get(name)?.close();
        this.#callbacks.delete(name);
    }

    /**
     * Returns a value to the webview JavaScript environment.
     *
     * @param {string} seq The request pointer as provided by the {@link Webview.bindRaw}
     * callback
     * @param {number} status If status is zero the result is expected to be a valid JSON
     * result value otherwise the result is an error JSON object
     * @param {number} result The stringified JSON response
     */
    return(seq, status, result) {
        lib.symbols.webview_return(
            this.#handle,
            encodeCString(seq),
            status,
            encodeCString(result),
        );
    }

    /**
     * Evaluates arbitrary JavaScript code. Evaluation happens asynchronously,
     * also the result of the expression is ignored. Use
     * {@link Webview.bind bindings} if you want to receive notifications about
     * the results of the evaluation.
     * @param {string} source 
     */
    eval(source) {
        lib.symbols.webview_eval(this.#handle, encodeCString(source));
    }

    /**
     * Injects JavaScript code at the initialization of the new page. Every time
     * the webview will open a the new page - this initialization code will be
     * executed. It is guaranteed that code is executed before window.onload.
     * @param {string} source 
     */
    init(source) {
        lib.symbols.webview_init(this.#handle, encodeCString(source));
    }
}