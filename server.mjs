import {contentType} from './mime.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
const root=resolve('dist');
http.createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep)&&path!==root)throw Error();const file=path===root||path===root+sep?resolve(root,'index.html'):path;res.setHeader('Content-Type',contentType(file));res.end(await readFile(file));}catch{res.writeHead(404);res.end('Não encontrado');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
