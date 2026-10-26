const PROJECTS=[
 ['Commercial','Urban Office Complex','a','Delivered a modern multi-level commercial development with efficient scheduling, tight budget control and high-quality finishes.'],
 ['Residential','Luxury Living Development','b','Managed construction of premium residential units with stringent quality, safety and timeline control.'],
 ['Industrial','Logistics Facility Upgrade','c','Improved operational capacity through phased upgrades and precise site coordination.'],
 ['Retail','Mixed-Use Retail Space','d','Created a customer-focused retail environment with durable finishes and thoughtful planning.'],
 ['Infrastructure','Site Infrastructure Works','e','Delivered civil and site-ready improvements for long-term asset performance and functionality.'],
 ['Renovation','Commercial Refurbishment','','Reimagined a tired commercial asset into a modern, functional and efficient workspace.']
];
const NAV=[['index.html','Home'],['about.html','About'],['services.html','Expertise'],['projects.html','Projects'],['request.html','Request a Quote'],['contact.html','Contact']];
const page=location.pathname.split('/').pop()||'index.html';
const ph=(c,t)=>`<div class="ph ${c||''}"><em>${t||''}</em></div>`;
document.body.insertAdjacentHTML('afterbegin',`
<header class="top"><div class="wrap"><a class="logo" href="index.html"><b>G</b><span>Gosele<strong>Consulting &amp; Projects</strong></span></a>
<nav class="dnav">${NAV.map(n=>`<a href="${n[0]}" class="${n[0]==page?'on':''}">${n[1]}</a>`).join('')}</nav><button class="menu-btn" aria-label="Open menu" id="mo">MENU</button></div></header>
<div class="veil" id="vl"></div>
<aside class="drawer" id="dr"><button id="mc" aria-label="Close menu">×</button><nav>${NAV.map((n,i)=>`<a href="${n[0]}" class="${n[0]==page?'on':''}"><i>0${i+1}</i>${n[1]}</a>`).join('')}</nav></aside>`);
const tg=o=>{dr.classList.toggle('open',o);vl.classList.toggle('open',o)};
mo.onclick=()=>tg(true);mc.onclick=vl.onclick=()=>tg(false);
document.querySelectorAll('[data-rail]').forEach(el=>{
 const cards=PROJECTS.map((p,i)=>`<a class="pj" href="project.html?p=${i}">${ph(p[2])}<h3>${p[1]}</h3><span>More information</span></a>`).join('');
 el.innerHTML=el.dataset.rail=='grid'?`<div class="pgrid">${cards}</div>`:`<div class="rail">${cards}</div>`;
});
const pd=document.getElementById('pd');
if(pd){const p=PROJECTS[+new URLSearchParams(location.search).get('p')]||PROJECTS[0];document.title=p[1]+' | Gosele Consulting and Projects';
 pd.innerHTML=`${ph(p[2],'Add project photo')}<div class="in"><p style="color:var(--or)">${p[0]}</p><h1>${p[1]}</h1><p style="color:var(--mut)">${p[3]}</p><a class="btn" href="request.html">Request a similar project</a></div>`}
document.body.insertAdjacentHTML('beforeend',`
<footer class="foot"><div class="wrap office"><div><h4>Visit our office ↗</h4><p><b>Pretoria Office:</b><br>707 Rentbel Towers,<br>14 Bureau Lane,<br>Pretoria, 0002</p></div><hr>
<div><h4>Contact us ↗</h4><p>Have any questions? Please don't hesitate to contact us at:<br><br>+27 (0) 11 234 5678<br>info@goseleconsult.co.za<br><br>Mon–Fri 8:00–17:00 · Sat 9:00–13:00<br>VAT No: 4620293714</p></div><hr>
<p class="copy">© <span id="yr"></span> Gosele Consulting and Projects. All rights reserved.</p></div></footer>`);
yr.textContent=new Date().getFullYear();
document.querySelectorAll('form[data-mail]').forEach(f=>f.addEventListener('submit',e=>{
 e.preventDefault();const d=new FormData(f);let b='';d.forEach((v,k)=>b+=k+': '+v+'\n');
 location.href='mailto:info@goseleconsult.co.za?subject='+encodeURIComponent(f.dataset.mail)+'&body='+encodeURIComponent(b);
 const s=f.querySelector('.status');s.style.display='block';s.textContent='Thank you. Your email app should open so you can send this enquiry.';
}));
