(function(){
  "use strict";

  var WHATSAPP_NUMBER = "5534984032340";

  /* ---------- Navbar scroll state ---------- */
  var navbar = document.getElementById("navbar");
  function onScroll(){
    if(window.scrollY > 12){ navbar.classList.add("is-scrolled"); }
    else{ navbar.classList.remove("is-scrolled"); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobilePanel = document.getElementById("mobilePanel");

  function closeMobile(){
    navToggle.classList.remove("is-open");
    mobilePanel.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  function toggleMobile(){
    var open = mobilePanel.classList.toggle("is-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  if(navToggle){
    navToggle.addEventListener("click", toggleMobile);
  }
  mobilePanel.querySelectorAll("a").forEach(function(a){
    a.addEventListener("click", closeMobile);
  });

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach(function(item){
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    q.addEventListener("click", function(){
      var isOpen = item.classList.contains("is-open");
      faqItems.forEach(function(other){
        other.classList.remove("is-open");
        other.querySelector(".faq-a").style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add("is-open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add("is-visible"); });
  }

  /* ---------- Contact form -> WhatsApp ---------- */
  var form = document.getElementById("contactForm");
  if(form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var nome = form.nome.value.trim();
      var empresa = form.empresa.value.trim();
      var email = form.email.value.trim();
      var segmento = form.segmento.value.trim();
      var mensagem = form.mensagem.value.trim();

      var lines = ["Olá! Gostaria de solicitar um orçamento para soluções web (site ou sistema)."];
      if(nome) lines.push("Nome: " + nome);
      if(empresa) lines.push("Empresa: " + empresa);
      if(email) lines.push("E-mail: " + email);
      if(segmento) lines.push("Segmento: " + segmento);
      if(mensagem) lines.push("Mensagem: " + mensagem);

      var text = encodeURIComponent(lines.join("\n"));
      window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + text, "_blank", "noopener");
    });
  }

  /* ---------- Smooth-close mobile menu on hash link click within page ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener("click", function(){
      closeMobile();
    });
  });

})();
