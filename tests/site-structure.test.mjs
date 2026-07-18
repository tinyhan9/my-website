import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, ...relativePath.split("/")));
}

function loadPortfolioData() {
  const code = readText("assets/site-data.js");
  const context = { window: {} };
  vm.runInNewContext(code, context);
  return context.window.PORTFOLIO_DATA;
}

function allMediaItems(data) {
  return [...data.heroVideos, ...data.featuredWorks, ...data.experiments];
}

function siblingPosterForSource(source) {
  const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".JPG", ".JPEG", ".PNG", ".WEBP", ".AVIF"];
  const parsed = path.posix.parse(source);
  return imageExts
    .map((extension) => `${parsed.dir}/${parsed.name}${extension}`)
    .find((candidate) => exists(candidate));
}

test("static site shell exposes the planned portfolio sections", () => {
  const html = readText("index.html");

  assert.match(html, /logo\/tinylogo\.svg/);
  assert.match(html, /class="brand-cluster"/);
  assert.match(html, /id="headerSocialList"/);
  assert.ok(html.indexOf('id="headerSocialList"') < html.indexOf('class="nav-links"'), "header socials should sit beside the logo before nav links");
  assert.match(html, /id="hero"/);
  assert.doesNotMatch(html, /CG \/ AI \/ MOTION DIRECTION/);
  assert.match(html, /id="workFilters"/);
  assert.match(html, /id="experimentFilters"/);
  assert.match(html, /id="works"/);
  assert.doesNotMatch(html, /intro-panel/);
  assert.match(html, /class="work-grid featured-grid" id="workGrid"/);
  assert.match(html, /class="work-grid featured-grid" id="experimentGrid"/);
  assert.doesNotMatch(html, /work-grid compact/);
  assert.match(html, /id="contentHub"/);
  assert.match(html, />精选作品<\/h2>/);
  assert.match(html, />其他作品<\/h2>/);
  assert.match(html, /aria-label="精选作品分类"/);
  assert.match(html, /aria-label="其他作品分类"/);
  assert.doesNotMatch(html, />主要作品<\/h2>/);
  assert.doesNotMatch(html, />个人实验作品<\/h2>/);
  assert.doesNotMatch(html, /aria-label="主要作品分类"/);
  assert.doesNotMatch(html, /aria-label="实验作品分类"/);
  assert.doesNotMatch(html, /实验作品 \/ 关于/);
  assert.match(html, /id="about"/);
  assert.ok(html.indexOf('id="experimentGrid"') < html.indexOf('id="about"'), "about section should appear after experiment works");
  assert.match(html, /href="#contentHub"/);
  assert.match(html, /href="#about"/);
  assert.match(html, /class="language-pill"[^>]*>中文<\/button>/);
  assert.doesNotMatch(html, /class="language-pill"[^>]*>ZH<\/button>/);
  assert.match(html, /<a href="#works">精选作品<\/a>/);
  assert.match(html, /<a href="#contentHub">其他作品<\/a>/);
  assert.doesNotMatch(html, /<a href="#works">主要作品<\/a>/);
  assert.doesNotMatch(html, /<a href="#contentHub">实验作品<\/a>/);
  assert.doesNotMatch(html, /id="panel-experiments"/);
  assert.doesNotMatch(html, /id="panel-about"/);
  assert.doesNotMatch(html, /data-panel-target="experiments"/);
  assert.doesNotMatch(html, /data-panel-target="about"/);
  assert.doesNotMatch(html, /href="#experiments"/);
  assert.match(html, /id="contactList"/);
  assert.match(html, /About & Contact/);
  assert.doesNotMatch(html, /class="hub-panel/);
  assert.doesNotMatch(html, /class="hub-tabs/);
  assert.doesNotMatch(html, /class="hub-tab/);
  assert.match(html, /assets\/site-data\.js/);
  assert.match(html, /script\.js/);
  assert.match(html, /styles\.css/);
  assert.match(html, /data-hero-direction="prev"/);
  assert.match(html, /data-hero-direction="next"/);
  assert.match(html, /hero-arrow-glyph/);
  assert.match(html, /id="socialPopover"/);
  assert.doesNotMatch(html, /source-link/);
  assert.doesNotMatch(html, /打开高清源文件/);
  assert.doesNotMatch(html, /点击直达/);
  assert.doesNotMatch(html, /(?:[A-Z]:\\|file:\/\/|H:\/|C:\/)/i);
  assert.doesNotMatch(html, /https?:\/\/.*\.(?:js|css)/i);
});

test("portfolio data covers current local assets and contact channels", () => {
  const data = loadPortfolioData();

  assert.equal(data.heroVideos.length, 20);
  assert.ok(data.featuredWorks.length >= 15);
  assert.ok(data.experiments.length >= 23);

  for (const section of [data.featuredWorks, data.experiments]) {
    for (const item of section) {
      assert.ok(item.title, "work item needs a title");
      assert.ok(item.category, `${item.title} needs a category`);
      assert.ok(item.description, `${item.title} needs a description`);
      assert.ok(item.source, `${item.title} needs a source video`);
      assert.ok(item.poster, `${item.title} needs a lightweight poster`);
      assert.ok(item.preview, `${item.title} needs a lightweight preview`);
      assert.notEqual(item.source, item.preview, `${item.title} preview must not overwrite original`);
      const siblingPoster = siblingPosterForSource(item.source);
      if (siblingPoster) {
        assert.equal(item.poster, siblingPoster, `${item.title} should use its same-folder image as poster`);
      }
    }
  }

  const contactLabels = JSON.parse(JSON.stringify(data.contact.map((item) => item.label)));
  assert.deepEqual(contactLabels, ["微信", "邮箱"]);
  assert.ok(data.contact.every((item) => item.label !== "电话"), "phone should be removed from about contact cards");

  const socialLabels = JSON.parse(JSON.stringify(data.social.map((item) => item.label)));
  for (const label of ["微信", "小红书", "bilibili", "邮箱"]) {
    assert.ok(socialLabels.includes(label), `missing social channel ${label}`);
  }
  assert.ok(!socialLabels.includes("Instagram"), "Instagram should be removed from social links");
  assert.ok(!socialLabels.includes("YouTube"), "YouTube should be removed from social links");

  const allTitles = new Set([...data.featuredWorks, ...data.experiments].map((item) => item.title));
  for (const title of ["特步 黄金棉", "云鲸逍遥扫地机", "信用卡案例", "哇嘎门头瀑布", "口红流体", "花中镜", "室内睡莲", "Bamboo Wind", "Bamboo Morden", "Knitting 01", "Knitting 02", "布料舞动"]) {
    assert.ok(allTitles.has(title), `missing renamed work title ${title}`);
  }
  for (const title of ["云锦逍遥", "Card Audio", "WAGA Logo", "Final", "Mirror", "Shuilian", "Baoboo", "Zhulin"]) {
    assert.ok(!allTitles.has(title), `old work title should be removed: ${title}`);
  }

  const descriptionsByTitle = new Map([...data.featuredWorks, ...data.experiments].map((item) => [item.title, item.description]));
  const copiedDescriptions = new Map([
    ["美的灵眸 V15 Pro", "角色：独立制作，AI内容为第三方制作"],
    ["九牧智能 ZD 系列海外", "角色：水特效模拟"],
    ["上好佳 虾片", "角色：所有特效模拟-虾片模拟、大蒜爆炸、花椒树生长、水泥地洞穿"],
    ["Anker eufy 智能割草机", "角色：特效模拟-草地运动、割草、射光灯效"],
    ["我乐拉手", "角色：特效模拟-粒子汇聚、粒子流动、流体碰撞交互、布料成型等；粒子流沙运动镜头制作"],
    ["云鲸逍遥扫地机", "角色：特效模拟-脏水交互、毛发粉尘垃圾吸附、地毯绒毛、滚刷毛运动、细菌消散、滚刷清水清洗交互等"],
    ["特步 黄金棉", "角色：特效模拟-衣袖膨胀、雨水模拟、羽绒服整体微动"],
    ["张韶涵演唱会水系列", "角色：特效模拟-水滴运动、水柱运动"],
    ["唐会电竞酒店 LOGO 瀑布", "角色：独立制作"],
    ["Roborock A30 Pure", "角色：部分镜头制作；特效模拟-脏水毛发粉尘垃圾吸附、滚刷清洁"],
    ["NIKE x TINY", "个人概念作品，视图通过超写实特效展示改款鞋的轻盈、透气和脚感、"],
    ["济泰医药形象宣传片", "角色：独立制作"],
    ["SKINCEUTICALS Cloth", "个人概念作品，美妆品牌语境下的布料与肌理实验，强调柔性材质、光泽与高端感。"],
    ["Feather Animation", "个人探索向作品，以羽毛动态为核心的短片实验，探索轻盈形态、节奏与空间中的细节表现。"],
    ["Dreame H13 Pro", "角色：前半部分三维镜头制作；特效模拟-脏水交互、毛发粉尘垃圾吸附、滚刷毛清洗"],
    ["Skin", "通过三维动态表现皮肤系统在化妆品的作用下的焕新过程"],
    ["Sunflower", "展示向日葵的完整生长，用明亮形态和运动节奏增强画面的情绪识别。"],
    ["裸眼 3D 定制海浪", "为三块屏幕做的定制化海浪，要求适配实地现场以及展示LOGO。通过海浪的冲击来呈现体积、层次与裸眼 3D 的空间错觉。"],
    ["Bamboo Wind", "室内植物系列二，通过一把天外来剑与狂风竹林的强烈动态来增强封闭空间内的视觉冲击。"],
    ["Bamboo Morden", "室内植物系列一，方形动态片段，用密度、层次与环境感营造沉浸氛围。"],
    ["Bamboo Rain", "室内植物系列三，竹与雨，突出自然声音感和空间氛围。"],
  ]);
  for (const [title, description] of copiedDescriptions) {
    assert.equal(descriptionsByTitle.get(title), description, `${title} should use copy from 视频文案.xlsx`);
  }

  const fabricDance = data.experiments.find((item) => item.id === "exp-fabric-dance");
  assert.ok(fabricDance, "布料舞动 should be included in other works");
  assert.equal(fabricDance.title, "布料舞动");
  assert.equal(fabricDance.category, "材质实验");
  assert.equal(fabricDance.source, "其他作品/布料舞动.mp4");
  assert.equal(fabricDance.poster, "其他作品/布料舞动.png");
  assert.equal(fabricDance.preview, "assets/previews/exp-fabric-dance.mp4");
  assert.equal(fabricDance.duration, "00:38");
  assert.equal(fabricDance.dimensions, "1080 x 1920");

  for (const id of ["work-midea-v15pro", "work-eufy-mower", "work-ole-handle", "work-yunjin-xiaoyao"]) {
    const item = data.featuredWorks.find((work) => work.id === id);
    assert.equal(item.category, "产品广告", `${id} should be categorized as 产品广告`);
  }

  for (const item of data.social) {
    assert.ok(item.color, `${item.label} needs a brand color`);
    assert.equal(item.displayValue, "", `${item.label} should not expose account text inline`);
    if (item.icon === "mail") {
      assert.equal(item.color, "#ff953e", "email should use the site orange accent");
    }
    if (["微信", "邮箱"].includes(item.label)) {
      assert.ok(item.popupValue, `${item.label} should reveal its value in a popover`);
      assert.equal(item.href, "", `${item.label} should open a popover instead of linking directly`);
    } else {
      assert.equal(item.displayValue, "", `${item.label} should not expose helper or account text`);
      assert.ok(item.href, `${item.label} should link directly`);
    }
  }
});

test("all runtime media references are project-relative and exist", () => {
  const data = loadPortfolioData();

  for (const item of allMediaItems(data)) {
    for (const key of ["source", "poster", "preview"]) {
      if (!item[key]) continue;
      assert.doesNotMatch(item[key], /(?:^[A-Z]:[\\/]|^\/|file:\/\/)/i, `${item.title || item.source} ${key} must be relative`);
      assert.doesNotMatch(item[key], /\\/i, `${item.title || item.source} ${key} should use URL-style slashes`);
      assert.ok(exists(item[key]), `${item[key]} should exist`);
    }
  }
});

test("script plays source video in the modal and supports manual hero arrows", () => {
  const script = readText("script.js");

  assert.match(script, /modalVideo\.src\s*=\s*item\.source/);
  assert.doesNotMatch(script, /modalSource/);
  assert.match(script, /data-hero-direction/);
  assert.match(script, /previousHero/);
  assert.match(script, /nextHero/);
  assert.match(script, /button\.textContent\s*=\s*document\.documentElement\.dataset\.lang\s*===\s*"en"\s*\?\s*"EN"\s*:\s*"中文"/);
  assert.doesNotMatch(script, /"ZH"/);
  assert.match(script, /ArrowLeft/);
  assert.match(script, /ArrowRight/);
  assert.match(script, /workFilters/);
  assert.match(script, /experimentFilters/);
  assert.match(script, /renderFilters\(workFilters,\s*data\.featuredWorks,\s*workGrid\)/);
  assert.match(script, /renderFilters\(experimentFilters,\s*data\.experiments,\s*experimentGrid\)/);
  assert.match(script, /contactList/);
  assert.match(script, /renderContacts/);
  assert.match(script, /headerSocialList/);
  assert.match(script, /renderHeaderSocials/);
  assert.match(script, /headerSocialIcons\s*=\s*\["wechat",\s*"xiaohongshu",\s*"bilibili"\]/);
  assert.doesNotMatch(script, /item-label">\$\{item\.label\}/);
  assert.doesNotMatch(script, /About & Contact/);
  assert.doesNotMatch(script, /selectPanel/);
  assert.doesNotMatch(script, /hubTitle/);
  assert.doesNotMatch(script, /data-panel-target/);
  assert.doesNotMatch(script, /hub-panel/);
  assert.match(script, /openSocialPopover/);
  assert.match(script, /popupValue/);
  assert.match(script, /social-button/);
  assert.doesNotMatch(script, /class="social-label">\$\{item\.label\}/);
  assert.doesNotMatch(script, /xiaohongshu:\s*'<path d="M6 4\.5h12l2 3\.5v10\.5H4V8z"/);
  assert.doesNotMatch(script, /xiaohongshu:[\s\S]*fill="currentColor"[\s\S]*stroke="#fff"/);
  assert.match(script, /xiaohongshu-seeklogo\.svg/);
  assert.ok(exists("xiaohongshu-seeklogo.svg"), "xiaohongshu logo asset should exist");
  assert.doesNotMatch(script, /mediaShape/);
  assert.doesNotMatch(script, /work-card--portrait/);
  assert.doesNotMatch(script, /work-card--wide/);
  assert.doesNotMatch(script, /点击直达/);
});

test("visual system uses dark background, opaque logo, and bold Microsoft YaHei", () => {
  const css = readText("styles.css");

  assert.match(css, /font-family:\s*"Microsoft YaHei"/);
  assert.match(css, /font-weight:\s*700/);
  assert.match(css, /background:\s*#050505/);
  assert.match(css, /--citrine:\s*#ff953e/);
  assert.doesNotMatch(css, /#d8ff3f/i);
  assert.doesNotMatch(css, /216,\s*255,\s*63/);
  assert.match(css, /\.brand img[\s\S]*opacity:\s*1/);
  assert.match(css, /\.brand\s*\{[\s\S]*background:\s*transparent/);
  assert.match(css, /\.brand\s*\{[\s\S]*border:\s*0/);
  assert.match(css, /\.brand-cluster\s*\{[\s\S]*display:\s*flex/);
  assert.match(css, /\.header-social-item\s*\{[\s\S]*width:\s*2\.15rem/);
  assert.match(css, /\.header-social-item\s*\{[\s\S]*height:\s*2\.15rem/);
  assert.match(css, /\.header-social-item \.icon[\s\S]*width:\s*1\.04rem/);
  assert.match(css, /\.nav-links \.language-pill\s*\{[\s\S]*font-size:\s*0\.92rem/);
  assert.match(css, /\.nav-links \.language-pill\s*\{[\s\S]*color:\s*var\(--muted\)/);
  assert.doesNotMatch(css, /mix-blend-mode:\s*difference/);
  assert.match(css, /\.social-item[\s\S]*--social-color/);
  assert.match(css, /\.social-item[\s\S]*width:\s*2\.72rem/);
  assert.match(css, /\.social-item[\s\S]*height:\s*2\.72rem/);
  assert.match(css, /\.social-item \.icon[\s\S]*width:\s*1\.32rem/);
  assert.match(css, /\.social-item:hover,\s*\.social-item:focus-visible[\s\S]*transform:\s*translateY\(-6px\)/);
  assert.match(css, /\.social-item:hover,\s*\.social-item:focus-visible[\s\S]*box-shadow:\s*0 28px 60px/);
  assert.match(css, /\.back-to-top[\s\S]*position:\s*fixed/);
  assert.match(css, /\.back-to-top[\s\S]*right:\s*max\(1rem,\s*env\(safe-area-inset-right\)\)/);
  assert.match(css, /\.back-to-top\.is-visible[\s\S]*opacity:\s*1/);
  assert.match(css, /\.footer-logo[\s\S]*background:\s*transparent/);
  assert.match(css, /\.social-popover/);
  assert.match(css, /\.hero\.is-switching/);
  assert.match(css, /\.work-card[\s\S]*aspect-ratio/);
  assert.match(css, /\.work-grid[\s\S]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /#contentHub,\s*#about[\s\S]*scroll-margin-top:\s*5\.5rem/);
  assert.match(css, /\.hub-section,\s*\.about-section[\s\S]*background:\s*#050505/);
  assert.doesNotMatch(css, /work-filter-spacer/);
  assert.match(css, /\.featured-grid\s*\{[\s\S]*column-count:\s*3/);
  assert.match(css, /\.featured-grid \.work-card,\s*\.featured-grid \.work-card:nth-child\(6n \+ 1\)[\s\S]*break-inside:\s*avoid/);
  assert.match(css, /\.featured-grid \.work-card:nth-child\(5n \+ 2\)[\s\S]*aspect-ratio:\s*4 \/ 5/);
  assert.doesNotMatch(css, /\.work-grid\.compact/);
  assert.doesNotMatch(css, /intro-panel/);
  assert.doesNotMatch(css, /grid-auto-flow:\s*dense/);
  assert.doesNotMatch(css, /\.work-card--portrait/);
  assert.doesNotMatch(css, /hub-panel/);
  assert.match(css, /\.card-title[\s\S]*font-size:\s*1\.02rem/);
  assert.match(css, /\.card-title[\s\S]*opacity:\s*0\.72/);
  assert.match(css, /\.card-title[\s\S]*transition:\s*font-size 220ms ease,\s*opacity 220ms ease/);
  assert.match(css, /\.work-card:hover \.card-title,\s*\.work-card:focus-visible \.card-title[\s\S]*font-size:\s*1\.28rem/);
  assert.match(css, /\.work-card:hover \.card-title,\s*\.work-card:focus-visible \.card-title[\s\S]*opacity:\s*1/);
  assert.match(css, /\.card-details[\s\S]*opacity:\s*0/);
  assert.match(css, /\.work-card:hover \.card-details[\s\S]*opacity:\s*1/);
  assert.match(css, /\.contact-list[\s\S]*display:\s*flex/);
  assert.match(css, /\.contact-list[\s\S]*flex-wrap:\s*wrap/);
  assert.match(css, /\.contact-list[\s\S]*margin-top:\s*3\.25rem/);
  assert.match(css, /\.contact-item[\s\S]*width:\s*max-content/);
  assert.match(css, /\.contact-item[\s\S]*min-height:\s*3\.5rem/);
  assert.match(css, /\.contact-item[\s\S]*border-radius:\s*8px/);
  assert.match(css, /\.contact-item \.icon[\s\S]*width:\s*1\.55rem/);
  assert.match(css, /\.contact-item:hover,\s*\.contact-item:focus-visible[\s\S]*transform:\s*translateY\(-6px\)/);
  assert.match(css, /\.contact-item:hover,\s*\.contact-item:focus-visible[\s\S]*box-shadow:\s*0 28px 60px/);
  assert.match(css, /\.hero-arrow\s*\{[\s\S]*width:\s*2rem/);
  assert.match(css, /hero-arrow-glyph/);
});
