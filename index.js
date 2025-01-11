import { SimpleVirtualFileSystem } from "./svfs/M_svfs_bun.js";

const svfs = new SimpleVirtualFileSystem(); 
const ip = '127.0.0.1';
const http_server = Bun.serve({
    port: 0,
    hostname: ip,
    fetch: async (req, server) => {
        if (server.upgrade(req)) {
            return;
        }
        const url = new URL(req.url);
        console.log(`[http-server] get request: ${url.pathname}`);
        let req_file_path = '/index.html'; 
        if(url.pathname != '/'){
            req_file_path = url.pathname;
        }
        const f = await svfs.getFileByPath(req_file_path);
        return new Response(f.blob, {headers:{'Content-Type': f.content_type}}); 
    },
    websocket: {
        message: websocketMsgHandler
    }
});

/**
 * 处理 websocket 请求
 * @param {ServerWebSocket<any>} ws 
 * @param {string} msg 
 */
async function websocketMsgHandler(ws, msg) {
    console.log('[main] 获取websocket消息：');
    console.log(msg);
}

console.log(`[main] 服务端创建完毕 open: http://${ip}:${http_server.port}`);


const window_worker = new Worker(new URL('./window.js', import.meta.url));
window_worker.addEventListener('error', (ev)=>{
    console.log('[main] window workder 线程报错：');
    console.log(ev.message);
    if(ev.message.indexOf('error: Failed to open library') >= 0){
        console.log('请检查系统是否安装 webview 库');
        console.log('Debian：libgtk-4-1 libwebkitgtk-6.0-4');
        console.log('Fedora：gtk4 webkitgtk6.0');
    }
}); 

window_worker.addEventListener('message', (ev) => {
    const msg = ev.data;
    console.log(`[main] 收到 win worker 消息：${msg}`);
    let res = null;
    try {
        res = JSON.parse(msg);
    } catch (error) {
        console.log('[main] 解析消息失败');
        console.log(error);
    }
    if (res && res?.action) {
        switch (res?.action) {
            case 'opened':
                console.log('[main] window worker 已启动.');
                window_worker.postMessage(JSON.stringify({
                    action: 'start-window',
                    url: `http://${ip}:${http_server.port}`
                }));
                break;
            case 'closed':
                console.log('[main] window worker 已关闭.');
                window_worker.terminate();
                http_server.stop();
                break;
            default:
                console.log(`[main] 未定义action参数：${res?.action}`); 
                break;
        }
    }else {
        console.log('[main] window worker 消息中不包含action参数');
    }
});

console.log(`[main] 窗口已开启`);
