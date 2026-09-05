/* ================================================================
   Event console feed
================================================================ */

import { $ } from './state.js';

function feed(msg, kind) {
    const box = $('feed');
    const div = document.createElement('div');
    div.className = 'feed-line ' + (kind || 'info');
    const d = new Date();
    const ts = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
    div.innerHTML = '<span class="t">' + ts + '</span>' + msg;
    box.appendChild(div);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity .8s'; }, 5200);
    setTimeout(() => div.remove(), 6100);
}



export { feed };
