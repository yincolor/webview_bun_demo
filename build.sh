cd ./svfs/
rm svfs.bin 
rm svfs_metadata.json
bun run ./mk_svfs.js
cd ..

mkdir build

bun build ./index.js ./window.js ./webview/lib/* --compile --outfile ./build/demo
