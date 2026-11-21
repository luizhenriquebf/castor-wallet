import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const file=url.pathname==='/__features'?resolve('tests/features.html'):url.pathname==='/__responsive'?resolve('tests/responsive.html'):resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(file!==resolve('tests/responsive.html')&&file!==resolve('tests/features.html')&&!file.startsWith(root+sep))throw Error();
    res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Não encontrado');}
}).listen(4174,'127.0.0.1',()=>console.log('Testes: http://127.0.0.1:4174/__responsive'));
