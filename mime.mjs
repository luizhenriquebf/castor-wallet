export function contentType(file){
  const extension=file.slice(file.lastIndexOf('.')).toLowerCase();
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8'})[extension]||'application/octet-stream';
}
