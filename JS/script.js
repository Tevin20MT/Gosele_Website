const NAV=[['index.html','Home'],
['about.html','About'],
['services.html','Services'],
['projects.html','Our Impact'],
['request.html','Request a Consultation'],
['contact.html','Contact']];

const page=location.pathname.split('/').pop()||'index.html';
document.body.insertAdjacentHTML('afterbegin',`
<header class="top">
<div class="wrap">
<a class="logo" href="index.html" aria-label="Gosele Consulting home">
<img src="assets/gosele-logo.jpeg" alt="Gosele Consulting — Insight. Action. Impact.">
</a>
<button class="menu-btn" aria-label="Open menu" id="mo">☰</button>
</div>
</header>

<div class="veil" id="vl">
</div>
<aside class="drawer" id="dr">
<button id="mc" aria-label="Close menu">×</button>
<nav>${NAV.map(n=>`<a href="${n[0]}" class="${n[0]==page?'on':''}">${n[1]}</a>`).join('')}</nav></aside>`);

const tg=o=>{dr.classList.toggle('open',o);vl.classList.toggle('open',o)};
mo.onclick=()=>tg(true);mc.onclick=vl.onclick=()=>tg(false);
document.body.insertAdjacentHTML('beforeend',`
<footer class="wrap">
<div class="grey office">
<div>
<h4>Insight. Action. Impact.
</h4>
<p>Skills development, workplace safety, stakeholder facilitation and ISO management systems.
</p>
</div>

<div>
<h4>Contact us
</h4>
<p>
<a href="tel:+27872654368">087 265 4368
</a>
<br>
<a href="tel:+27827512137">082 751 2137
</a>
<br>
<a href="mailto:info@goseleconsult.co.za">
info@goseleconsult.co.za
</a>
</p>
</div>

<p class="copy">© <span id="yr">
</span> Gosele Consulting. All rights reserved.
<br>
<span class="credit">Designed by Matsogo Tau Projects (PTY) LTD
</span>
</p>
</div>
</footer>`);

yr.textContent=new Date().getFullYear();
let pageTransitioning=false;
document.addEventListener('click',e=>
   {
 if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||matchMedia('(prefers-reduced-motion: reduce)')
   .matches)
return;

 const link=e.target.closest('a[href]');
 if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))
   return;
 
 const destination=new URL(link.href,location.href);
 if(destination.protocol!==location.protocol||destination.host!==location.host||
    (destination.pathname===location.pathname&&destination.search===location.search))
    return;
 e.preventDefault();
 if(pageTransitioning)
   return;
 pageTransitioning=true;
 document.body.classList.add('page-leaving');
 setTimeout(()=>location.assign(destination.href),260);
});
window.addEventListener('pageshow',()=>{pageTransitioning=false;
   document.body.classList.remove('page-leaving')});
document.querySelectorAll('form[data-mail]').forEach(f=>f.addEventListener('submit',e=>{
 e.preventDefault();
 
 const d=new FormData(f);
 let b='';
 d.forEach((v,k)=>b+=k+': '+v+'\n');
 location.href='mailto:info@goseleconsult.co.za?subject='+encodeURIComponent(f.dataset.mail)+'&body='+encodeURIComponent(b);

 const s=f.querySelector('.status');
 s.style.display='block';
 s.textContent='Thank you. Your email app should open so you can send this enquiry.';
}));
