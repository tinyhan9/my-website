(function () {
  const data = window.PORTFOLIO_DATA;
  const hero = document.querySelector(".hero");
  const heroVideo = document.querySelector(".hero-video");
  const heroStrip = document.querySelector("#heroStrip");
  const heroArrows = document.querySelector(".hero-arrows");
  const workGrid = document.querySelector("#workGrid");
  const experimentGrid = document.querySelector("#experimentGrid");
  const workFilters = document.querySelector("#workFilters");
  const experimentFilters = document.querySelector("#experimentFilters");
  const socialList = document.querySelector("#socialList");
  const headerSocialList = document.querySelector("#headerSocialList");
  const contactList = document.querySelector("#contactList");
  const modal = document.querySelector("#workModal");
  const modalVideo = document.querySelector("#modalVideo");
  const modalTitle = document.querySelector("#modalTitle");
  const modalCategory = document.querySelector("#modalCategory");
  const modalDescription = document.querySelector("#modalDescription");
  const modalDuration = document.querySelector("#modalDuration");
  const modalDimensions = document.querySelector("#modalDimensions");
  const socialPopover = document.querySelector("#socialPopover");
  const socialPopoverLabel = document.querySelector("#socialPopoverLabel");
  const socialPopoverValue = document.querySelector("#socialPopoverValue");
  const socialCopyButton = document.querySelector("#socialCopyButton");
  const backToTop = document.querySelector("#backToTop");

  let heroIndex = 0;
  let heroButtons = [];
  let heroSwitchTimer = 0;
  let heroDragStartX = null;
  let activeSocialValue = "";
  const headerSocialIcons = ["wechat", "xiaohongshu", "instagram"];

  const iconPaths = {
    mail: '<path d="M3 6.5h18v11H3z"/><path d="m4 7 8 6 8-6"/>',
    phone: '<path d="M8 4.5 5.7 6.8c-.5.5-.7 1.2-.4 1.9 1.6 4.4 5.1 7.9 9.5 9.5.7.3 1.4.1 1.9-.4L19 15.5l-3.5-2-1.8 1.8c-2.1-1-3.8-2.7-4.8-4.8l1.8-1.8L8 4.5z"/>',
    wechat: '<path d="M9.3 15.2c-3.1 0-5.6-1.9-5.6-4.4s2.5-4.4 5.6-4.4c2.8 0 5.1 1.6 5.5 3.8"/><path d="M13.8 10.8c2.9 0 5.2 1.8 5.2 4s-2.3 4-5.2 4c-.8 0-1.5-.1-2.2-.4L9 19l.8-2c-.7-.7-1.2-1.5-1.2-2.4 0-2 2.3-3.8 5.2-3.8z"/><path d="M7.8 9.8h.1M10.8 9.8h.1M12.3 14.4h.1M15.3 14.4h.1"/>',
    bilibili: '<path d="M7 8h10c1.2 0 2 .8 2 2v6.5c0 1.2-.8 2-2 2H7c-1.2 0-2-.8-2-2V10c0-1.2.8-2 2-2z"/><path d="m9 5 2 3M15 5l-2 3M9 13h.1M15 13h.1"/>',
    instagram: '<rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="3.2"/><path d="M16.6 7.6h.1"/>',
    youtube: '<path d="M4.5 8.5c.2-1 1-1.8 2-1.9 3.6-.4 7.4-.4 11 0 1 .1 1.8.9 2 1.9.4 2.3.4 4.7 0 7-.2 1-1 1.8-2 1.9-3.6.4-7.4.4-11 0-1-.1-1.8-.9-2-1.9-.4-2.3-.4-4.7 0-7z"/><path d="m10.5 9.8 4.5 2.2-4.5 2.2z"/>',
  };

  const iconAssets = {
    xiaohongshu: "xiaohongshu-seeklogo.svg",
  };

  function icon(name) {
    if (iconAssets[name]) {
      return `<img class="icon icon-image" src="${iconAssets[name]}" alt="" aria-hidden="true" loading="lazy" />`;
    }
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.mail}</svg>`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function categories(items) {
    return ["全部", ...Array.from(new Set(items.map((item) => item.category)))];
  }

  function renderFilters(container, items, grid) {
    container.innerHTML = categories(items)
      .map((category, index) => `<button class="filter-button${index === 0 ? " is-active" : ""}" type="button" data-filter="${category}" aria-pressed="${index === 0}">${category}</button>`)
      .join("");

    container.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-filter]");
      if (!button) return;
      const filter = button.dataset.filter;
      container.querySelectorAll(".filter-button").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      grid.querySelectorAll(".work-card").forEach((card) => {
        const show = filter === "全部" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !show);
      });
    });
  }

  function renderCards(container, items, offset = 0) {
    container.innerHTML = items
      .map((item, index) => {
        const number = pad(index + 1 + offset);
        return `
          <article class="work-card reveal" role="button" tabindex="0" data-id="${item.id}" data-category="${item.category}" aria-label="播放 ${item.title}">
            <span class="card-index">${number}</span>
            <div class="card-media">
              <img src="${item.poster}" alt="${item.title}" loading="lazy" />
              <video muted playsinline loop preload="none" poster="${item.poster}" data-preview="${item.preview}"></video>
            </div>
            <div class="card-copy">
              <h3 class="card-title">${item.title}</h3>
              <div class="card-details" aria-hidden="true">
                <span class="card-category">${item.category}</span>
                <div class="card-meta">
                  <span>${item.duration}</span>
                  <span>${item.dimensions}</span>
                </div>
                <p class="card-description">${item.description}</p>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    container.addEventListener("pointerover", playCardPreview);
    container.addEventListener("pointerout", stopCardPreview);
    container.addEventListener("click", (event) => {
      const card = event.target.closest(".work-card");
      if (!card) return;
      const item = items.find((work) => work.id === card.dataset.id);
      if (item) openModal(item);
    });
    container.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest(".work-card");
      if (!card) return;
      event.preventDefault();
      const item = items.find((work) => work.id === card.dataset.id);
      if (item) openModal(item);
    });
  }

  function playCardPreview(event) {
    const card = event.target.closest(".work-card");
    if (!card || !card.contains(event.target)) return;
    const video = card.querySelector("video");
    if (!video) return;
    if (!video.src) video.src = video.dataset.preview;
    video.play().catch(() => {});
  }

  function stopCardPreview(event) {
    const card = event.target.closest(".work-card");
    if (!card || card.contains(event.relatedTarget)) return;
    const video = card.querySelector("video");
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  function openModal(item) {
    modalTitle.textContent = item.title;
    modalCategory.textContent = item.category;
    modalDescription.textContent = item.description;
    modalDuration.textContent = item.duration;
    modalDimensions.textContent = item.dimensions;
    modalVideo.poster = item.poster;
    modalVideo.src = item.source;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modalVideo.play().catch(() => {});
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modalVideo.load();
  }

  function renderSocials(container, items, itemClass = "social-item") {
    container.innerHTML = items
      .map((item, index) => {
        const content = icon(item.icon);
        const style = `style="--social-color:${item.color}"`;
        if (item.popupValue) {
          return `<button class="${itemClass} social-button" ${style} type="button" data-social-index="${index}" aria-label="查看${item.label}">${content}</button>`;
        }
        return `<a class="${itemClass}" ${style} href="${item.href}" target="_blank" rel="noopener" aria-label="${item.label}">${content}</a>`;
      })
      .join("");

    container.addEventListener("click", (event) => {
      const button = event.target.closest(".social-button");
      if (!button) return;
      const item = items[Number(button.dataset.socialIndex)];
      if (item) openSocialPopover(item);
    });
  }

  function renderHeaderSocials(container, items) {
    renderSocials(
      container,
      items.filter((item) => headerSocialIcons.includes(item.icon)),
      "header-social-item"
    );
  }

  function renderContacts(container, items) {
    container.innerHTML = items
      .map((item) => {
        const content = `${icon(item.icon)}<span class="item-value">${item.value}</span>`;
        if (item.href) {
          return `<a class="contact-item" href="${item.href}" aria-label="${item.value}">${content}</a>`;
        }
        return `<div class="contact-item" aria-label="${item.value}">${content}</div>`;
      })
      .join("");
  }

  function renderHeroStrip() {
    heroStrip.innerHTML = data.heroVideos
      .map((_, index) => `<button class="hero-dot" type="button" data-index="${index}" aria-label="播放首屏视频 ${pad(index + 1)}"><span>${pad(index + 1)}</span></button>`)
      .join("");
    heroButtons = Array.from(heroStrip.querySelectorAll(".hero-dot"));
    heroStrip.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-index]");
      if (!button) return;
      setHeroVideo(Number(button.dataset.index));
    });
  }

  function setHeroVideo(index) {
    const count = data.heroVideos.length;
    heroIndex = ((index % count) + count) % count;
    const item = data.heroVideos[heroIndex];
    heroButtons.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === heroIndex);
      button.style.setProperty("--progress", "0%");
    });
    window.clearTimeout(heroSwitchTimer);
    hero.classList.add("is-switching");
    heroSwitchTimer = window.setTimeout(() => {
      heroVideo.poster = item.poster;
      heroVideo.src = item.source;
      heroVideo.play().catch(() => {});
      hero.classList.remove("is-switching");
    }, 120);
  }

  function previousHero() {
    setHeroVideo(heroIndex - 1);
  }

  function nextHero() {
    setHeroVideo(heroIndex + 1);
  }

  function isTextEditingTarget(target) {
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function isHeroVisible() {
    const rect = hero.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function handleHeroKeyboard(event) {
    if (event.defaultPrevented || !isHeroVisible() || isTextEditingTarget(event.target)) return;
    if (modal.classList.contains("is-open") || socialPopover.classList.contains("is-open")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousHero();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextHero();
    }
  }

  function setupHero() {
    renderHeroStrip();
    heroVideo.addEventListener("ended", nextHero);
    heroVideo.addEventListener("error", nextHero);
    heroVideo.addEventListener("timeupdate", () => {
      const button = heroButtons[heroIndex];
      if (!button || !heroVideo.duration) return;
      button.style.setProperty("--progress", `${(heroVideo.currentTime / heroVideo.duration) * 100}%`);
    });
    heroArrows.addEventListener("click", (event) => {
      const button = event.target.closest("[data-hero-direction]");
      if (!button) return;
      if (button.dataset.heroDirection === "prev") previousHero();
      if (button.dataset.heroDirection === "next") nextHero();
    });
    hero.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button, a")) return;
      heroDragStartX = event.clientX;
      hero.classList.add("is-dragging");
      hero.setPointerCapture(event.pointerId);
    });
    hero.addEventListener("pointerup", (event) => {
      if (heroDragStartX === null) return;
      const delta = event.clientX - heroDragStartX;
      heroDragStartX = null;
      hero.classList.remove("is-dragging");
      if (Math.abs(delta) < 60) return;
      if (delta > 0) previousHero();
      if (delta < 0) nextHero();
    });
    hero.addEventListener("pointercancel", () => {
      heroDragStartX = null;
      hero.classList.remove("is-dragging");
    });
    document.addEventListener("keydown", handleHeroKeyboard);
    setHeroVideo(0);
  }

  function openSocialPopover(item) {
    activeSocialValue = item.popupValue || item.value || "";
    socialPopover.style.setProperty("--social-color", item.color || "var(--citrine)");
    socialPopoverLabel.textContent = item.label;
    socialPopoverValue.textContent = activeSocialValue;
    socialCopyButton.textContent = "复制";
    socialPopover.hidden = false;
    socialPopover.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => socialPopover.classList.add("is-open"));
  }

  function closeSocialPopover() {
    socialPopover.classList.remove("is-open");
    socialPopover.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      if (!socialPopover.classList.contains("is-open")) socialPopover.hidden = true;
    }, 180);
  }

  function setupSocialPopover() {
    socialPopover.querySelector(".social-popover-backdrop").addEventListener("click", closeSocialPopover);
    socialPopover.querySelector(".social-popover-close").addEventListener("click", closeSocialPopover);
    socialCopyButton.addEventListener("click", () => {
      if (!activeSocialValue) return;
      if (!navigator.clipboard) {
        socialCopyButton.textContent = "已显示";
        return;
      }
      navigator.clipboard.writeText(activeSocialValue).then(() => {
        socialCopyButton.textContent = "已复制";
      }).catch(() => {
        socialCopyButton.textContent = "已显示";
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && socialPopover.classList.contains("is-open")) closeSocialPopover();
    });
  }

  function setupModal() {
    modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);
    modal.querySelector(".modal-close").addEventListener("click", closeModal);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  function setupReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));
  }

  function setupBackToTop() {
    if (!backToTop) return;
    const toggleBackToTop = () => {
      const visible = window.scrollY > window.innerHeight * 0.65;
      backToTop.classList.toggle("is-visible", visible);
      backToTop.setAttribute("aria-hidden", String(!visible));
    };

    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", toggleBackToTop, { passive: true });
    toggleBackToTop();
  }

  function setupLanguageReserve() {
    const button = document.querySelector(".language-pill");
    button.addEventListener("click", () => {
      document.documentElement.dataset.lang = document.documentElement.dataset.lang === "en" ? "zh" : "en";
      button.textContent = document.documentElement.dataset.lang === "en" ? "EN" : "中文";
    });
  }

  setupHero();
  renderCards(workGrid, data.featuredWorks);
  renderCards(experimentGrid, data.experiments, data.featuredWorks.length);
  renderFilters(workFilters, data.featuredWorks, workGrid);
  renderFilters(experimentFilters, data.experiments, experimentGrid);
  renderContacts(contactList, data.contact);
  renderHeaderSocials(headerSocialList, data.social);
  renderSocials(socialList, data.social);
  setupSocialPopover();
  setupModal();
  setupReveal();
  setupBackToTop();
  setupLanguageReserve();
})();
