import { Webview } from "./webview/webview.js";
// import { Webview } from "webview-bun";
console.log('[window] 窗口线程启动');

async function start_window(url) {
    const win = new Webview(true, { height: 700, width: 800 });
    win.navigate(url);
    win.title = 'demo';
    win.run();
    self.postMessage(JSON.stringify({ action: 'closed' }));
}

self.addEventListener('message', (ev) => {
    const msg = ev.data; 
    console.log(`[window] 收到主进程消息：${msg}`);
    const res = JSON.parse(msg);
    if (res?.action) {
        switch (res.action) {
            case "start-window":
                console.log("[window] 收到启动命令，开启窗口");
                start_window(res.url);
                break;
            default:
                console.log(`[window] 主进程消息异常：未定义的action ${res.action}`);
                break;
        }
    } else {
        console.log(`[window] 主进程消息异常：没有action参数. msg = ${msg}`);
    }
});

self.postMessage(JSON.stringify({ action: 'opened' }));

console.log('[window] 窗口线程已就绪'); 
