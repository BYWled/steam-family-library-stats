// ==UserScript==
// @name         Steam 家庭库统计
// @name:en      Steam Family Library Stats
// @namespace    https://github.com/BYWled/steam-family-library-stats
// @version      1.0.0
// @description  适配Steam全新React虚拟列表与CSS-Module混淆架构，精准提取家庭共享游戏归属与严谨计分
// @description:en  Precisely extract game ownership within a Steam Family and score every member fairly. Fully adapted to Steam's brand-new React virtual list and CSS-Module obfuscated architecture.
// @author       BYWled
// @match        *://store.steampowered.com/account/familymanagement*
// @grant        none
// @license      GPL-3.0
// @icon         https://store.steampowered.com/favicon.ico
// @homepageURL  https://github.com/BYWled/steam-family-library-stats
// @supportURL   https://github.com/BYWled/steam-family-library-stats/issues
// @source       https://github.com/BYWled/steam-family-library-stats/raw/refs/heads/main/steam-family-library-stats.user.js
// ==/UserScript==

// ------------------------------------------------------------------
// Copyright (C) 2026 BYWled
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, version 3 of the License.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/gpl-3.0.html>.
// ------------------------------------------------------------------

(function () {
    'use strict';

    // ==========================================
    // 1. 全局数据中心
    // ==========================================
    const state = {
        users: new Set(["我"]),
        // Map: appId/key => { name, appId, category, owners: Set, copies: number }
        games: new Map(),
        scannedKeys: new Set(), // 依据 appId/唯一名称去重，避免虚拟列表复用DOM导致的漏扫
        isScanning: false,
        statusMessage: "点击下方按钮开始全自动扫描",
        stats: {
            totalIncluded: 0,
            totalExcluded: 0,
            totalFree: 0
        }
    };

    // ==========================================
    // 2. 严谨计分系统
    // ==========================================
    // 权重公式: 1人独有=3分，6人共有=1分 -> 线性权重: weight = 3.4 - 0.4 * ownerCount
    function calculateWeight(ownerCount) {
        if (ownerCount <= 0) return 0;
        const w = 3.4 - 0.4 * ownerCount;
        return w < 1 ? 1 : Math.round(w * 100) / 100;
    }

    function recalculateStats() {
        state.stats.totalIncluded = 0;
        state.stats.totalExcluded = 0;
        state.stats.totalFree = 0;

        const userStats = new Map();
        for (const u of state.users) {
            userStats.set(u, { count: 0, exclusiveCount: 0, score: 0 });
        }

        for (const [, gameData] of state.games) {
            if (gameData.category === '已排除的游戏') {
                state.stats.totalExcluded++;
            } else if (gameData.category === '免费游戏') {
                state.stats.totalFree++;
            } else if (gameData.category === '已包含的游戏') {
                state.stats.totalIncluded++;
                const count = gameData.owners.size;
                const weight = calculateWeight(count);

                for (const u of gameData.owners) {
                    if (!userStats.has(u)) {
                        userStats.set(u, { count: 0, exclusiveCount: 0, score: 0 });
                        state.users.add(u);
                    }
                    const s = userStats.get(u);
                    s.count++;
                    if (count === 1) s.exclusiveCount++;
                    s.score += weight;
                }
            }
        }
        return userStats;
    }

    // ==========================================
    // 3. 文本与所有权解析引擎
    // ==========================================
    function cleanGameName(raw) {
        if (!raw) return '';
        return raw
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // 清理不可见零宽字符
            .replace(/^[《\s]+|[》\s]+$/g, '')    // 清理书名号与首尾空白
            .trim();
    }

    function cleanMemberName(str) {
        if (!str) return '';
        let cleaned = str
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[*:\uff1a]/g, '') // 移除星号及冒号
            .replace(/^来自/, '')
            .replace(/的库$/, '')
            .trim();

        if (!cleaned || cleaned.length > 30 || cleaned.includes('篇用户评测') || cleaned.includes('评测结果')) {
            return '';
        }
        return cleaned;
    }

    // 基于 5 种实际 DOM 结构的归属解析引擎
    function parseOwnersFromTooltip(tooltip) {
        const owners = new Set();
        if (!tooltip) {
            owners.add('我');
            return owners;
        }

        const ownerBox = tooltip.querySelector('[class*="HSL873"]') ||
            Array.from(tooltip.querySelectorAll('div')).find(d => (d.innerText || '').includes('来自'));

        // 情况 3：我独有（HSL873 存在但内容为空，或根本没有归属信息）
        if (!ownerBox || !ownerBox.innerText || ownerBox.innerText.trim() === '') {
            owners.add('我');
            state.users.add('我');
            return owners;
        }

        const boxText = ownerBox.innerText.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

        // 情况 4 & 5：包含“以下成员”列表（严格仅提取 <ul><li> 渲染内容）
        if (boxText.includes('以下成员')) {
            if (boxText.includes('您')) owners.add('我');

            const listItems = ownerBox.querySelectorAll('li');
            listItems.forEach(li => {
                const name = cleanMemberName(li.innerText);
                if (name) owners.add(name);
            });
        } else {
            // 情况 1 & 2：单行文本
            const match = boxText.match(/来自\s*(.+?)\s*的库/);
            const content = match ? match[1].trim() : boxText;

            if (content.startsWith('您及') || content.startsWith('您和')) {
                owners.add('我');
                const others = content.replace(/^您(?:及|和)/, '').trim();
                others.split(/(?:[、,，和])/).forEach(o => {
                    const n = cleanMemberName(o);
                    if (n) owners.add(n);
                });
            } else if (content === '您') {
                owners.add('我');
            } else {
                content.split(/(?:[、,，和])/).forEach(o => {
                    const n = cleanMemberName(o);
                    if (n === '您') owners.add('我');
                    else if (n) owners.add(n);
                });
            }
        }

        if (owners.size === 0) {
            owners.add('我');
        }

        owners.forEach(u => state.users.add(u));
        return owners;
    }

    // ==========================================
    // 4. DOM 提取与事件模拟核心
    // ==========================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 智能定位游戏卡片元素
    function findGameCards() {
        let list = Array.from(document.querySelectorAll('div[data-key="hover div"]'));
        if (list.length > 0) return list;

        const imgs = document.querySelectorAll('img[src*="/apps/"], img[src*="steamstatic"]');
        const cards = new Set();
        for (const img of imgs) {
            const card = img.closest('div[data-key="hover div"]') ||
                         img.closest('div[role="button"][tabindex="0"]') ||
                         img.closest('div[class*="Focusable"][style*="107px"]') ||
                         img.parentElement?.parentElement;
            if (card) cards.add(card);
        }
        return Array.from(cards);
    }

    // 智能嗅探当前真正的滚动容器
    function findScrollContainer() {
        const sample = document.querySelector('div[data-key="hover div"], img[src*="/apps/"]');
        if (sample) {
            let parent = sample.parentElement;
            while (parent && parent !== document.body && parent !== document.documentElement) {
                const style = window.getComputedStyle(parent);
                if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight + 40) {
                    return parent;
                }
                parent = parent.parentElement;
            }
        }
        return window;
    }

    function scrollDown(container, distance = 300) {
        if (container === window || container === document.body || container === document.documentElement) {
            window.scrollBy({ top: distance, behavior: 'smooth' });
        } else {
            container.scrollBy({ top: distance, behavior: 'smooth' });
        }
    }

    function isContainerBottom(container) {
        if (container === window || container === document.body || container === document.documentElement) {
            const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
            const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
            return (window.innerHeight + scrollY) >= (docH - 40);
        }
        return (container.scrollTop + container.clientHeight) >= (container.scrollHeight - 40);
    }

    // 完整的 Pointer + Mouse 真实事件链分发
    function dispatchMouseEventChain(el, isEnter) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.round(rect.left + rect.width / 2);
        const y = Math.round(rect.top + rect.height / 2);
        const related = document.body;

        const eventProps = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
            button: 0,
            buttons: 0,
            relatedTarget: related
        };

        const pointerProps = {
            ...eventProps,
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            width: 1,
            height: 1
        };

        if (isEnter) {
            if (window.PointerEvent) {
                el.dispatchEvent(new PointerEvent('pointerover', pointerProps));
                el.dispatchEvent(new PointerEvent('pointerenter', { ...pointerProps, bubbles: false }));
            }
            el.dispatchEvent(new MouseEvent('mouseover', eventProps));
            el.dispatchEvent(new MouseEvent('mouseenter', { ...eventProps, bubbles: false }));
            if (window.PointerEvent) {
                el.dispatchEvent(new PointerEvent('pointermove', pointerProps));
            }
            el.dispatchEvent(new MouseEvent('mousemove', eventProps));
        } else {
            if (window.PointerEvent) {
                el.dispatchEvent(new PointerEvent('pointerout', pointerProps));
                el.dispatchEvent(new PointerEvent('pointerleave', { ...pointerProps, bubbles: false }));
            }
            el.dispatchEvent(new MouseEvent('mouseout', eventProps));
            el.dispatchEvent(new MouseEvent('mouseleave', { ...eventProps, bubbles: false }));
        }
    }

    function hoverGameCard(capsule, isEnter) {
        const img = capsule.querySelector('img');
        const btn = capsule.querySelector('[role="button"]') || capsule;

        if (isEnter) {
            capsule.style.outline = '2px solid #67c1f5'; // 实时高亮正在识别的卡片
            if (capsule.focus) { try { capsule.focus(); } catch (_) {} }
        } else {
            capsule.style.outline = '';
            if (capsule.blur) { try { capsule.blur(); } catch (_) {} }
        }

        if (img) dispatchMouseEventChain(img, isEnter);
        if (btn !== capsule) dispatchMouseEventChain(btn, isEnter);
        dispatchMouseEventChain(capsule, isEnter);
    }

    // 等待并提取浮层数据（严格联动角标与标题，杜绝提前误退）
    async function waitAndExtractTooltipInfo(expectedCopies, targetGameName) {
        const maxWaitMs = 2200; // 给予充足的 React 异步渲染时间
        const intervalMs = 60;
        let elapsed = 0;

        while (elapsed < maxWaitMs) {
            if (!state.isScanning) return { realName: '', owners: new Set(['我']) };

            const tooltip = document.querySelector('[class*="k0yt"]');
            if (tooltip) {
                const titleNode = tooltip.querySelector('[class*="io6uTUtzW"]');
                const realName = titleNode ? cleanGameName(titleNode.innerText) : '';

                // 核心校验 1：确保捕获的浮层属于当前卡片，防止读到上一个卡片的残留旧浮层
                const isMatchingTitle = !targetGameName || !realName ||
                    realName.includes(targetGameName) || targetGameName.includes(realName) ||
                    realName.toLowerCase() === targetGameName.toLowerCase();

                if (isMatchingTitle) {
                    const ownerBox = tooltip.querySelector('[class*="HSL873"]');
                    if (ownerBox) {
                        const text = (ownerBox.innerText || '').trim();
                        const hasList = ownerBox.querySelector('li') !== null;
                        const hasFrom = text.includes('来自');

                        // 核心校验 2：如果角标显示为多人(expectedCopies > 1)，必须等待归属加载出内容，绝对禁止在空文本时提前退出！
                        if (expectedCopies > 1) {
                            if (hasFrom || hasList) {
                                const owners = parseOwnersFromTooltip(tooltip);
                                // 如果已解析出的人数满足角标数量，或者等待超时且已获取到多个成员，才准许返回
                                if (owners.size >= expectedCopies || (owners.size > 1 && elapsed >= 700)) {
                                    return { realName, owners };
                                }
                            }
                        } else {
                            // 单人持有情况 (expectedCopies === 1)
                            // 1. 如果出现了“来自”，说明是其他成员独有（情况1），立即返回
                            if (hasFrom) {
                                const owners = parseOwnersFromTooltip(tooltip);
                                return { realName, owners };
                            }
                            // 2. 如果标签和评测已渲染完毕，且等待了至少 850ms 仍无“来自”字样，才判定为“我独有”（情况3）
                            const hasTagsOrReviews = tooltip.querySelector('[class*="WidgetTag"], [class*="ReviewScore"]') !== null;
                            if (hasTagsOrReviews && elapsed >= 850 && text === '') {
                                const owners = parseOwnersFromTooltip(tooltip);
                                return { realName, owners };
                            }
                        }
                    }
                }
            }

            await sleep(intervalMs);
            elapsed += intervalMs;
        }

        // 超时兜底解析
        const fallback = document.querySelector('[class*="k0yt"]');
        const titleNode = fallback?.querySelector('[class*="io6uTUtzW"]');
        const realName = titleNode ? cleanGameName(titleNode.innerText) : '';
        const owners = parseOwnersFromTooltip(fallback);

        // 强保底防错：若角标明确写着是多人游戏(>1)，但超时只识别出了"我"，说明浮层未能正确载入归属，补充占位成员，杜绝虚假独占
        if (expectedCopies > 1 && owners.size === 1 && owners.has('我')) {
            for (let i = 2; i <= expectedCopies; i++) {
                owners.add(`家庭成员_${i}`);
            }
        }

        return { realName, owners };
    }

    function getCategoryPositions() {
        const cats = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            const val = (node.nodeValue || '').trim();
            for (const name of ['已包含的游戏', '已排除的游戏', '免费游戏']) {
                if (val.startsWith(name)) {
                    const rect = node.parentElement.getBoundingClientRect();
                    cats.push({ name, top: rect.top + window.scrollY });
                }
            }
        }
        cats.sort((a, b) => a.top - b.top);
        return cats;
    }

    function determineCategory(capsule, categories) {
        if (!categories || categories.length === 0) return '已包含的游戏';
        const cardTop = capsule.getBoundingClientRect().top + window.scrollY;
        let current = categories[0].name;
        for (const c of categories) {
            if (cardTop >= c.top - 60) {
                current = c.name;
            }
        }
        return current;
    }

    // ==========================================
    // 5. 核心全自动扫描循环
    // ==========================================
    async function toggleAutoScan() {
        if (state.isScanning) {
            state.isScanning = false;
            state.statusMessage = "扫描已手动中止";
            updatePanelUI();
            return;
        }

        state.isScanning = true;
        state.statusMessage = "🔄 正在平滑遍历游戏库，请勿移动鼠标...";
        updatePanelUI();

        const scrollContainer = findScrollContainer();
        let noNewItemsRound = 0;
        let lastPos = -1;

        // 首批元素就位保证
        const initialCards = findGameCards();
        if (initialCards.length > 0) {
            initialCards[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            await sleep(400);
        }

        while (state.isScanning) {
            const categories = getCategoryPositions();
            const capsules = findGameCards();
            let foundNewInView = false;

            for (const capsule of capsules) {
                if (!state.isScanning) break;

                const img = capsule.querySelector('img');
                if (!img) continue;

                const src = img.src || '';
                const appMatch = src.match(/apps\/(\d+)/);
                const appId = appMatch ? appMatch[1] : '';

                let rawName = img.alt || '';
                let gameName = cleanGameName(rawName);
                if (!gameName) {
                    const titleDiv = capsule.querySelector('[class*="io6uTUtzW"]');
                    if (titleDiv) gameName = cleanGameName(titleDiv.innerText);
                }
                if (!gameName) gameName = appId ? `App_${appId}` : "未知游戏";

                const uniqueKey = appId || gameName;

                if (state.scannedKeys.has(uniqueKey)) continue;

                // 视口检查
                const rect = capsule.getBoundingClientRect();
                if (rect.bottom < -20 || rect.top > window.innerHeight + 20) {
                    continue;
                }

                foundNewInView = true;
                state.scannedKeys.add(uniqueKey);

                // 平滑滚入视口边界，杜绝页面乱跳
                capsule.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                await sleep(80);

                // 读取副本数量角标 (必须为叶子节点且文本为2-9，避免父容器文本干扰)
                let copyCount = 1;
                const copyBadge = Array.from(capsule.querySelectorAll('div')).find(d =>
                    d.children.length === 0 && /^[2-9]$/.test(d.innerText.trim())
                );
                if (copyBadge) {
                    copyCount = parseInt(copyBadge.innerText.trim(), 10) || 1;
                }

                const category = determineCategory(capsule, categories);

                if (category === '已包含的游戏') {
                    state.statusMessage = `正在识别: ${gameName}`;
                    updatePanelUI();

                    hoverGameCard(capsule, true);
                    let result = await waitAndExtractTooltipInfo(copyCount, gameName);

                    // 多人游戏补救重试：如果角标显示有多份，但提取到的人数少于角标，重新派发一次悬浮事件重试
                    if (copyCount > 1 && result.owners.size < copyCount) {
                        hoverGameCard(capsule, false);
                        await sleep(150);
                        hoverGameCard(capsule, true);
                        result = await waitAndExtractTooltipInfo(copyCount, gameName);
                    }

                    hoverGameCard(capsule, false);

                    // 等待浮层彻底从 DOM 销毁，杜绝串扰到下一个游戏
                    let waitClose = 0;
                    while (document.querySelector('[class*="k0yt"]') && waitClose < 250) {
                        await sleep(50);
                        waitClose += 50;
                    }

                    const finalGameName = result.realName || gameName;

                    state.games.set(uniqueKey, {
                        name: finalGameName,
                        appId: appId,
                        category: category,
                        owners: result.owners,
                        copies: copyCount
                    });

                    await sleep(120);
                } else {
                    state.games.set(uniqueKey, {
                        name: gameName,
                        appId: appId,
                        category: category,
                        owners: new Set(['不计分']),
                        copies: 1
                    });
                }

                updatePanelUI();
            }

            if (!state.isScanning) break;

            // 平滑向下滚动
            scrollDown(scrollContainer, 280);
            await sleep(650);

            const atBottom = isContainerBottom(scrollContainer);
            const currentPos = scrollContainer === window ? (window.scrollY || document.documentElement.scrollTop) : scrollContainer.scrollTop;
            const scrollStalled = lastPos !== -1 && Math.abs(currentPos - lastPos) < 5;

            if (!foundNewInView && (atBottom || scrollStalled)) {
                noNewItemsRound++;
                if (noNewItemsRound >= 4) {
                    state.isScanning = false;
                    state.statusMessage = "🎉 扫描已全部完成！已遍历整个家庭库。";
                    updatePanelUI();
                    break;
                }
            } else {
                noNewItemsRound = 0;
                lastPos = currentPos;
            }
        }
    }

    // ==========================================
    // 6. UI 界面与交互
    // ==========================================
    let panel;

    function injectStyles() {
        if (document.getElementById('steam-family-stats-style')) return;
        const style = document.createElement('style');
        style.id = 'steam-family-stats-style';
        style.textContent = `
            #statsPanel {
                position: fixed; bottom: 20px; right: 20px; background: #1b2838;
                color: #c6d4df; padding: 0; border-radius: 8px; z-index: 9999999;
                width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.85);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                border: 1px solid #2a475e; overflow: hidden;
            }
            #statsHeader {
                background: linear-gradient(90deg, #1A9FFF 0%, #106297 100%);
                color: white; padding: 12px 16px; font-weight: bold; font-size: 14px;
                display: flex; justify-content: space-between; align-items: center;
            }
            #statsContent { padding: 14px; max-height: 520px; overflow-y: auto; }
            .statsTable { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .statsTable th {
                background: rgba(42, 71, 94, 0.5); color: #67c1f5; padding: 7px 6px;
                text-align: left; font-size: 12px; border-bottom: 2px solid #2a475e;
            }
            .statsTable td { padding: 7px 6px; border-bottom: 1px solid rgba(42, 71, 94, 0.4); font-size: 13px; }
            .statsTable th:nth-child(n+2), .statsTable td:nth-child(n+2) { text-align: right; }
            .statsTable tr:hover { background: rgba(103, 193, 245, 0.1); }
            .actionBtn {
                background: #3d6c8d; color: white; border: none; padding: 9px 0;
                border-radius: 4px; cursor: pointer; font-weight: bold; transition: all 0.2s;
                flex: 1; margin: 0 4px; text-align: center; font-size: 13px;
            }
            .actionBtn:hover { background: #67c1f5; color: #1b2838; }
            .actionBtn.active { background: #e25822; color: white; }
            .actionBtn.active:hover { background: #ff7640; }
            .btnGroup { display: flex; justify-content: space-between; margin-top: 14px; }
            .totalCount { color: #67c1f5; font-weight: bold; margin-bottom: 6px; font-size: 13px; }
            .subCount { color: #8f98a0; font-size: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed rgba(103, 193, 245, 0.25); }
            .statusBar {
                background: rgba(0,0,0,0.3); border-radius: 4px; padding: 6px 10px;
                font-size: 12px; color: #ffcc00; margin-top: 6px; white-space: nowrap;
                overflow: hidden; text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(style);
    }

    function createPanel() {
        if (document.getElementById('statsPanel')) return;
        injectStyles();
        panel = document.createElement('div');
        panel.id = 'statsPanel';
        document.body.appendChild(panel);

        panel.addEventListener('click', (e) => {
            if (e.target.id === 'autoScanBtn') toggleAutoScan();
            if (e.target.id === 'exportBtn') exportCSV();
        });

        updatePanelUI();
    }

    function updatePanelUI() {
        if (!panel) return;
        const userStats = recalculateStats();

        let tbody = '';
        const sorted = [...state.users].sort((a, b) => (userStats.get(b)?.score || 0) - (userStats.get(a)?.score || 0));

        for (const u of sorted) {
            const data = userStats.get(u);
            if (!data) continue;

            const ratio = state.stats.totalIncluded > 0
                ? ((data.count / state.stats.totalIncluded) * 100).toFixed(1) + '%'
                : '0.0%';

            tbody += `
                <tr>
                    <td style="font-weight: 500;">${u}</td>
                    <td>${data.count}</td>
                    <td style="color: #9cd5ff;">${data.exclusiveCount}</td>
                    <td>${ratio}</td>
                    <td style="color: #ffc83b; font-weight: bold;">${data.score.toFixed(1)}</td>
                </tr>
            `;
        }

        panel.innerHTML = `
        <div id="statsHeader">
            <span>🎮 Steam 家庭库统计</span>
            <span style="font-size: 11px; background: rgba(0,0,0,0.25); padding: 2px 6px; border-radius: 10px;">v1.0.0</span>
        </div>
        <div id="statsContent">
            <div class="totalCount">
                📊 计分库游戏：<span style="color: white; font-size: 17px;">${state.stats.totalIncluded}</span> 款
            </div>
            <div class="subCount">
                (已排除: ${state.stats.totalExcluded} | 免费: ${state.stats.totalFree}) 不计入得分
                <div class="statusBar">${state.statusMessage}</div>
            </div>
            <table class="statsTable">
                <thead>
                    <tr>
                        <th>👤 成员</th>
                        <th>持有</th>
                        <th>独占</th>
                        <th>📈 占比</th>
                        <th>⭐ 得分</th>
                    </tr>
                </thead>
                <tbody>${tbody}</tbody>
            </table>
            <div class="btnGroup">
                <button id="autoScanBtn" class="actionBtn ${state.isScanning ? 'active' : ''}">
                    ${state.isScanning ? '⏹ 停止扫描' : '🚀 全自动扫描'}
                </button>
                <button id="exportBtn" class="actionBtn">💾 导出 CSV</button>
            </div>
        </div>
        `;
    }

    // ==========================================
    // 7. CSV 导出功能
    // ==========================================
    function exportCSV() {
        const rows = [['AppID', '游戏名称', '分类状态', '库存副本数', '归属成员']];
        for (const [, data] of state.games) {
            rows.push([
                data.appId || '',
                data.name.replace(/,/g, '，'),
                data.category,
                data.copies || 1,
                [...data.owners].join('、')
            ]);
        }

        const csvString = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Steam_Family_Library_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ==========================================
    // 8. 启动引导
    // ==========================================
    function bootstrap() {
        if (document.body) {
            createPanel();
        } else {
            const mo = new MutationObserver(() => {
                if (document.body) {
                    mo.disconnect();
                    createPanel();
                }
            });
            mo.observe(document.documentElement, { childList: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();
