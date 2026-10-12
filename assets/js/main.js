/* =====================================================================
   SIOSS · دبلوم إعداد معلمي ومعلمات التربية البدنية
   سلوك الموقع: الفهرس المنبثق، تذكّر الصفحات المزارة، البحث، التنقل
   بلوحة المفاتيح، وتكبير الصور. التنقل الأساسي (السابق/التالي، مسار
   التنقل، صفحات الوحدة) مكتوب داخل كل صفحة ويعمل حتى دون هذا الملف.
   ===================================================================== */
(function () {
  'use strict';

  /* اجعلها true لإعادة توجيه من لم يسجّل الدخول إلى صفحة الدخول.
     تنبيه: هذا حاجز شكلي في المتصفح وليس حماية حقيقية للمحتوى. */
  var REQUIRE_LOGIN = false;

  var HOME = 'course.html';
  var LOGIN = 'index.html';
  var TOC = window.SIOSS_TOC;
  var doc = document;
  var body = doc.body;
  if (!TOC) return;

  var file = body.getAttribute('data-page') || decodeURIComponent(location.pathname.split('/').pop() || '');

  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* التخزين غير متاح */ }
    }
  };

  if (REQUIRE_LOGIN && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    var ok = false;
    try { ok = localStorage.getItem('loggedIn') === 'true'; } catch (e) { ok = true; }
    if (!ok) { location.replace(LOGIN + '?next=' + encodeURIComponent(file || HOME)); return; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function count(n, one, two, few, many) {
    if (n === 1) return one;
    if (n === 2) return two;
    var m = n % 100;
    return n + ' ' + (m >= 3 && m <= 10 ? few : many);
  }
  var KIND = { sum: 'ملخص', self: 'تقييم ذاتي', ex: 'تمرين', pdf: 'ملف PDF' };
  function badges(pg) {
    var h = '';
    if (pg.v) h += '<span class="tag tag-video"><span class="play" aria-hidden="true"></span>' + (pg.v === 1 ? 'فيديو' : count(pg.v, '', 'فيديوهان', 'فيديوهات', 'فيديو')) + '</span>';
    if (pg.k) h += '<span class="tag tag-' + pg.k + '">' + KIND[pg.k] + '</span>';
    return h;
  }
  /* توحيد الحروف للبحث (استبدال حرف بحرف حتى تبقى المواضع متطابقة مع النص الأصلي) */
  function norm(s) {
    return String(s).toLowerCase().replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  function bare(s) { return String(s).replace(/[ً-ٰٟـ]/g, ''); }

  var flat = [];
  TOC.units.forEach(function (u, ui) {
    u.p.forEach(function (p, i) { flat.push({ f: p[0], t: p[1], v: p[2], k: p[3], u: ui, i: i }); });
  });
  var cur = null;
  flat.forEach(function (pg) { if (pg.f === file) cur = pg; });

  var seen = store.get('sioss:seen', []);
  if (!Array.isArray(seen)) seen = [];
  function isSeen(f) { return seen.indexOf(f) >= 0; }

  if (cur) {
    if (!isSeen(cur.f)) { seen.push(cur.f); store.set('sioss:seen', seen); }
    store.set('sioss:last', cur.f);
  }

  if (body.classList.contains('home')) initHome();
  else initPage();

  /* ===================================================================
     الفهرس المنبثق (كل الوحدات)
     =================================================================== */
  function initDrawer(btn) {
    var overlay = doc.createElement('div');
    overlay.className = 'overlay';
    var drawer = doc.createElement('aside');
    drawer.className = 'drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'فهرس الدورة');
    drawer.innerHTML =
      '<div class="drawer-head"><strong>فهرس الدورة</strong>' +
      '<button type="button" class="drawer-close" aria-label="إغلاق الفهرس">×</button></div>' +
      '<div class="drawer-tools"><input class="drawer-filter" type="search" placeholder="ابحث عن صفحة…" aria-label="ابحث في عناوين الصفحات" autocomplete="off"></div>' +
      '<div class="drawer-body"></div>';
    body.appendChild(overlay);
    body.appendChild(drawer);
    var built = false;
    var listEl = drawer.querySelector('.drawer-body');
    var filter = drawer.querySelector('.drawer-filter');

    function build() {
      var h = '<a class="drawer-home" href="' + HOME + '">الصفحة الرئيسية للدورة</a>';
      TOC.parts.forEach(function (part) {
        h += '<p class="drawer-part">' + esc(part.t) + '</p>';
        part.u.forEach(function (ui) {
          var u = TOC.units[ui];
          var here = cur && cur.u === ui;
          h += '<details' + (here ? ' open' : '') + '><summary' + (here ? ' class="cur"' : '') + '><i>' + (ui + 1) + '</i>' + esc(u.t) + '</summary><ol>';
          u.p.forEach(function (p) {
            var pg = { f: p[0], t: p[1], v: p[2], k: p[3] };
            var cls = cur && pg.f === cur.f ? 'here' : (isSeen(pg.f) ? 'seen' : '');
            h += '<li><a' + (cls ? ' class="' + cls + '"' : '') + (cls === 'here' ? ' aria-current="page"' : '') +
              ' href="' + pg.f + '"><span class="t">' + esc(pg.t) + '</span>' + badges(pg) + '</a></li>';
          });
          h += '</ol></details>';
        });
      });
      listEl.innerHTML = h;
      built = true;
    }
    function open(e) {
      if (e) e.preventDefault();
      if (!built) build();
      body.classList.add('drawer-open');
      var here = drawer.querySelector('.here');
      if (here) here.scrollIntoView({ block: 'center' });
      drawer.querySelector('.drawer-close').focus();
    }
    function close() {
      if (!body.classList.contains('drawer-open')) return false;
      body.classList.remove('drawer-open');
      btn.focus();
      return true;
    }
    btn.addEventListener('click', open);
    overlay.addEventListener('click', close);
    drawer.querySelector('.drawer-close').addEventListener('click', close);
    filter.addEventListener('input', function () {
      var term = norm(bare(filter.value.trim()));
      drawer.querySelectorAll('details').forEach(function (d) {
        var any = false;
        d.querySelectorAll('li').forEach(function (li) {
          var hit = !term || norm(bare(li.textContent)).indexOf(term) >= 0;
          li.hidden = !hit;
          if (hit) any = true;
        });
        d.hidden = !any;
        d.open = term ? any : !!(cur && d.querySelector('.here'));
      });
      drawer.querySelectorAll('.drawer-part').forEach(function (p) {
        var n = p.nextElementSibling, any = false;
        while (n && n.tagName === 'DETAILS') { if (!n.hidden) any = true; n = n.nextElementSibling; }
        p.hidden = !any;
      });
    });
    return { close: close };
  }

  /* ===================================================================
     صفحات الدروس والصفحات البسيطة
     =================================================================== */
  function initPage() {
    var btn = doc.getElementById('tocBtn');
    var drawer = btn ? initDrawer(btn) : null;

    /* العمود الجانبي: علامة ✓ للصفحات المزارة، وإظهار الصفحة الحالية */
    var side = doc.querySelector('.side');
    if (side) {
      side.querySelectorAll('.side-pages a').forEach(function (a) {
        if (!a.classList.contains('here') && isSeen(a.getAttribute('href'))) a.classList.add('seen');
      });
      var here = side.querySelector('.here');
      if (here) side.scrollTop = Math.max(0, here.offsetTop - side.clientHeight / 2);
    }

    /* الصور: بديل عند فشل التحميل، وتكبير عند النقر */
    function missing(img) {
      var fig = img.closest('.fig') || img;
      var ph = doc.createElement('p');
      ph.className = 'fig-missing';
      ph.textContent = 'تعذّر تحميل هذه الصورة';
      fig.parentNode.replaceChild(ph, fig);
    }
    doc.querySelectorAll('.fig img').forEach(function (img) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { missing(img); return; }
      img.addEventListener('error', function () { missing(img); });
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'تكبير الصورة: ' + img.alt);
      function zoom() {
        var lb = doc.createElement('div');
        lb.className = 'lightbox';
        var big = doc.createElement('img');
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        lb.appendChild(big);
        lb.addEventListener('click', function () { lb.remove(); });
        body.appendChild(lb);
      }
      img.addEventListener('click', zoom);
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoom(); } });
    });

    /* لوحة المفاتيح — اتجاه عربي: السهم الأيسر = التالي */
    var next = doc.querySelector('.pager-next');
    var prev = doc.querySelector('.pager-prev');
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var lb = doc.querySelector('.lightbox');
        if (lb) lb.remove();
        else if (drawer) drawer.close();
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || body.classList.contains('drawer-open')) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === 'ArrowLeft' && next) location.href = next.getAttribute('href');
      if (e.key === 'ArrowRight' && prev) location.href = prev.getAttribute('href');
    });
  }

  /* ===================================================================
     الصفحة الرئيسية
     =================================================================== */
  function initHome() {
    var last = store.get('sioss:last', null);
    var unitList = doc.getElementById('unitList');
    var results = doc.getElementById('results');
    var hint = doc.getElementById('hint');
    var empty = doc.getElementById('empty');
    var q = doc.getElementById('q');
    var filters = doc.querySelectorAll('.filter');

    doc.querySelectorAll('.pages a').forEach(function (a) {
      var f = a.getAttribute('href');
      if (isSeen(f)) a.classList.add('seen');
      if (f === last) a.classList.add('last');
    });
    doc.querySelectorAll('.unit').forEach(function (u) {
      var all = u.querySelectorAll('.pages a').length;
      var done = u.querySelectorAll('.pages a.seen').length;
      var bar = u.querySelector('.ubar i');
      if (bar && all) bar.style.width = Math.round((done / all) * 100) + '%';
      if (all && done === all) u.classList.add('done');
      if (done) {
        var um = u.querySelector('.um');
        if (um) um.textContent += ' · زرت ' + done + ' من ' + all;
      }
    });

    /* متابعة من حيث توقّف المتدرب */
    var lastPg = null;
    flat.forEach(function (pg) { if (pg.f === last) lastPg = pg; });
    var resume = doc.getElementById('resume');
    if (lastPg && resume) {
      resume.querySelector('strong').textContent = 'الوحدة ' + (lastPg.u + 1) + ': ' + TOC.units[lastPg.u].t + ' — ' + lastPg.t;
      resume.querySelector('a').href = lastPg.f;
      resume.hidden = false;
      var start = doc.getElementById('startBtn');
      if (start) { start.textContent = 'تابع التعلّم'; start.href = lastPg.f; }
    }

    /* فتح الوحدة المشار إليها في الرابط (‎#u5) */
    function openHash() {
      var t = location.hash && doc.getElementById(location.hash.slice(1));
      if (t && t.tagName === 'DETAILS') { t.open = true; t.scrollIntoView({ block: 'start' }); }
    }
    window.addEventListener('hashchange', openHash);
    openHash();

    /* --- التصفية حسب نوع الصفحة --- */
    function applyFilter(type) {
      var hits = 0;
      doc.querySelectorAll('.unit').forEach(function (u) {
        var any = false;
        u.querySelectorAll('.pages li').forEach(function (li) {
          var okType = !type || (' ' + li.getAttribute('data-types') + ' ').indexOf(' ' + type + ' ') >= 0;
          li.hidden = !okType;
          if (okType) { any = true; hits++; }
        });
        u.hidden = !any;
        u.open = !!type && any;
      });
      doc.querySelectorAll('.part').forEach(function (p) { p.hidden = !p.querySelector('.unit:not([hidden])'); });
      hint.textContent = type ? count(hits, 'صفحة واحدة مطابقة', 'صفحتان مطابقتان', 'صفحات مطابقة', 'صفحة مطابقة') : '';
    }
    filters.forEach(function (b) {
      b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false');
      b.addEventListener('click', function () {
        filters.forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (q.value) { q.value = ''; showUnits(); }
        applyFilter(b.getAttribute('data-filter'));
      });
    });

    /* --- البحث في كل نصوص الدروس --- */
    var index = null;
    var loading = null;
    function loadIndex() {
      if (!loading) {
        loading = fetch('assets/js/search-index.json')
          .then(function (r) { return r.json(); })
          .then(function (d) { index = {}; d.forEach(function (e) { index[e.f] = { x: e.x, n: norm(e.x) }; }); })
          .catch(function () { index = {}; });
      }
      return loading;
    }
    function showUnits() {
      results.hidden = true;
      results.innerHTML = '';
      unitList.hidden = false;
      empty.hidden = true;
      hint.textContent = '';
    }
    function snippet(entry, pos, len) {
      var x = entry.x;
      var a = Math.max(0, pos - 60);
      var b = Math.min(x.length, pos + len + 110);
      if (a > 0) { var sa = x.indexOf(' ', a); if (sa >= 0 && sa < pos) a = sa + 1; }
      if (b < x.length) { var sb = x.lastIndexOf(' ', b); if (sb > pos + len) b = sb; }
      return (a > 0 ? '… ' : '') + esc(x.slice(a, pos)) + '<mark>' + esc(x.slice(pos, pos + len)) + '</mark>' + esc(x.slice(pos + len, b)) + (b < x.length ? ' …' : '');
    }
    function runSearch() {
      var term = norm(bare(q.value.trim()));
      if (term.length < 2) { showUnits(); return; }
      filters.forEach(function (x, i) { x.classList.toggle('on', i === 0); x.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); });
      applyFilter('');
      var found = [];
      flat.forEach(function (pg) {
        var inTitle = norm(bare(pg.t)).indexOf(term) >= 0;
        var e = index && index[pg.f];
        var pos = e ? e.n.indexOf(term) : -1;
        if (inTitle || pos >= 0) found.push({ pg: pg, inTitle: inTitle, e: e, pos: pos });
      });
      found.sort(function (a, b) { return (b.inTitle - a.inTitle) || 0; });
      unitList.hidden = true;
      results.hidden = false;
      empty.hidden = found.length > 0;
      hint.textContent = found.length ? count(found.length, 'نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة') + (found.length > 40 ? ' — تُعرض أول 40' : '') : '';
      results.innerHTML = found.slice(0, 40).map(function (r) {
        return '<li><a href="' + r.pg.f + '"><small>الوحدة ' + (r.pg.u + 1) + ' · ' + esc(TOC.units[r.pg.u].t) + '</small>' +
          '<strong>' + esc(r.pg.t) + badges(r.pg) + '</strong>' +
          (r.pos >= 0 ? '<p>' + snippet(r.e, r.pos, term.length) + '</p>' : '') + '</a></li>';
      }).join('');
    }
    if (q) {
      q.addEventListener('focus', loadIndex);
      q.addEventListener('input', function () { loadIndex().then(runSearch); runSearch(); });
    }
  }
})();
