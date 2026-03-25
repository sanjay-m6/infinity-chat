const fs=require('fs');

let c1 = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');
c1 = c1.replace(/}\`~/g, '}`>');
fs.writeFileSync('src/components/Sidebar.jsx', c1);

let c2 = fs.readFileSync('src/components/ChatArea.jsx', 'utf8');
let idx1 = c2.indexOf('<div className=\'absolute inset-0');
let idx2 = c2.indexOf('</div>', idx1);
if(idx1 !== -1 && idx2 !== -1) {
  c2 = c2.substring(0, idx1) + "<div className='absolute inset-0 opacity-[0.06] dark:opacity-5 pointer-events-none' style={{backgroundImage: 'url(https://static.whatsapp.net/rsrc.php/v3/yl/r/r_QZ352iIoo.png)', backgroundRepeat: 'repeat'}}></div>" + c2.substring(idx2 + 6);
  fs.writeFileSync('src/components/ChatArea.jsx', c2);
}