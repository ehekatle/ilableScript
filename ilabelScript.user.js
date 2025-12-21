// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilableScript
// @version      2.4.3
// @description  预埋、豁免、直播信息违规、超时提示功能，集成推送功能
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilableScript
// @source       https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilabelScript.user.js
// @supportURL   https://github.com/ehekatle/ilableScript/issues
// @updateURL    https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilabelScript.meta.js
// @downloadURL  https://gh-proxy.org/https/raw.githubusercontent.com/ehekatle/ilableScript/main/ilabelScript.user.js
// @match        https://ilabel.weixin.qq.com/mixed-task/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weixin.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @connect      gh-proxy.org
// @connect      qyapi.weixin.qq.com
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 全局变量
    const SWITCH_KEY = 'ilabel_reminder_enabled';
    const REMOTE_SCRIPT_URL = 'https://gh-proxy.org/https://github.com/ehekatle/ilableScript/blob/test/ilableScript.js';

    // 本地版本号
    const LOCAL_VERSION = GM_info.script.version;

    let config = null;
    let remoteFunctions = null;
    let currentLiveData = null;
    let currentResultType = null; // 新增：记录当前结果的类型
    let lastPopupTime = null;
    let popupConfirmed = true;
    let popupCheckInterval = null;
    let remoteVersion = null;

    // ========== 样式定义 ==========
    const STYLES = `
        .ilabel-switch-container {
            position: fixed;
            bottom: 0px;
            left: 60px;
            z-index: 999999;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            padding: 8px;
            display: flex;
            align-items: center;
            min-width: auto;
            transition: all 0.3s ease;
        }

        .ilabel-switch-container:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        }

        .ilabel-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }

        .ilabel-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .ilabel-switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }

        .ilabel-switch-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .ilabel-switch-slider {
            background-color: #07c160;
        }

        input:checked + .ilabel-switch-slider:before {
            transform: translateX(20px);
        }

        .ilabel-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-left: 6px;
            display: none;
        }

        .ilabel-status-dot.loading {
            display: block;
            background: #1890ff;
            animation: pulse 1.5s infinite;
        }

        .ilabel-status-dot.success {
            display: block;
            background: #52c41a;
        }

        .ilabel-status-dot.error {
            display: block;
            background: #f5222d;
        }

        .ilabel-status-dot.warning {
            display: block;
            background: #faad14;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }

        /* 版本信息提示 */
        .ilabel-version-tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
            z-index: 1000000;
        }

        .ilabel-version-tooltip:after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: #333;
        }

        .ilabel-switch-container:hover .ilabel-version-tooltip {
            opacity: 1;
            visibility: visible;
        }

        /* 弹窗样式 */
        #ilabel-alert-popup {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            border: 2px solid !important;
            border-radius: 10px !important;
            padding: 20px !important;
            z-index: 1000000 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
            font-family: Arial, sans-serif !important;
            min-width: 350px !important;
            max-width: 500px !important;
            background: white !important;
        }

        .ilabel-popup-title {
            font-size: 16px !important;
            font-weight: bold !important;
            margin-bottom: 15px !important;
            padding-bottom: 10px !important;
            border-bottom: 1px solid !important;
        }

        .ilabel-popup-content {
            font-size: 14px !important;
            line-height: 1.5 !important;
            margin-bottom: 15px !important;
        }

        .ilabel-button-container {
            display: flex !important;
            justify-content: space-between !important;
            gap: 10px !important;
        }

        .ilabel-button {
            flex: 1 !important;
            padding: 8px 20px !important;
            border: none !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            transition: opacity 0.3s !important;
        }

        .ilabel-button:hover {
            opacity: 0.9 !important;
        }

        .ilabel-copy-liveid {
            cursor: pointer !important;
            color: #2196f3 !important;
            text-decoration: underline !important;
            font-family: monospace !important;
        }

        /* 错误提示样式 */
        .ilabel-error-toast {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #f44336;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 999999;
            font-family: Arial, sans-serif;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            max-width: 300px;
        }
    `;

    // ========== 功能函数 ==========

    // 加载远程脚本
    function loadRemoteScript() {
        console.log('开始加载远程脚本...');
        updateStatusDot('loading');

        GM_xmlhttpRequest({
            method: 'GET',
            url: REMOTE_SCRIPT_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        parseRemoteScript(response.responseText);
                    } catch (e) {
                        console.error('远程脚本解析失败:', e);
                        updateStatusDot('error');
                        showError('远程脚本解析失败: ' + e.message);
                    }
                } else {
                    console.error('远程脚本加载失败，状态码:', response.status);
                    updateStatusDot('error');
                    showError('远程脚本加载失败，状态码: ' + response.status);
                }
            },
            onerror: function(error) {
                console.error('远程脚本加载网络错误:', error);
                updateStatusDot('error');
                showError('远程脚本加载网络错误');
            }
        });
    }

    // 解析远程脚本
    function parseRemoteScript(scriptContent) {
        // 提取远程版本号
        const versionMatch = scriptContent.match(/\/\*\s*VERSION:\s*([\d\.]+)\s*\*\//);
        remoteVersion = versionMatch ? versionMatch[1].trim() : null;

        if (!remoteVersion) {
            console.error('未找到远程版本号');
            updateStatusDot('error');
            showError('远程配置缺少版本号');
            return;
        }

        // 检查版本一致性
        if (remoteVersion !== LOCAL_VERSION) {
            console.warn(`版本不匹配: 本地=${LOCAL_VERSION}, 远程=${remoteVersion}`);
            updateStatusDot('warning');
            return;
        }

        // 解析配置
        const configMatch = scriptContent.match(/\/\* CONFIG START \*\/([\s\S]*?)\/\* CONFIG END \*\//);
        if (configMatch) {
            const configStr = configMatch[1];
            config = {};

            // 解析主播白名单（字符串数组）
            const anchorWhiteListMatch = configStr.match(/anchorWhiteList\s*=\s*"([^"]+)"/);
            if (anchorWhiteListMatch) {
                config.anchorWhiteList = anchorWhiteListMatch[1].trim().split(/\s+/);
            }

            // 解析处罚关键词（字符串数组）
            const penaltyKeywordsMatch = configStr.match(/penaltyKeywords\s*=\s*"([^"]+)"/);
            if (penaltyKeywordsMatch) {
                config.penaltyKeywords = penaltyKeywordsMatch[1].trim().split(/\s+/);
            }

            // 解析审核白名单（对象数组）
            const auditorWhiteListMatch = configStr.match(/const\s+auditorWhiteList\s*=\s*(\[[\s\S]*?\])\s*;/);
            if (auditorWhiteListMatch) {
                try {
                    config.auditorWhiteList = new Function('return ' + auditorWhiteListMatch[1].trim() + ';')();
                    console.log('审核白名单加载成功:', config.auditorWhiteList);

                    // 提取姓名列表用于兼容性检查
                    config.auditorNameList = config.auditorWhiteList.map(item => item.name);
                } catch (e) {
                    console.error('解析审核白名单失败:', e);
                    config.auditorWhiteList = [];
                    config.auditorNameList = [];
                }
            }

            // 解析审核黑名单（字符串数组）
            const auditorBlackListMatch = configStr.match(/auditorBlackList\s*=\s*(\[[\s\S]*?\])\s*;/);
            if (auditorBlackListMatch) {
                try {
                    config.auditorBlackList = new Function('return ' + auditorBlackListMatch[1].trim() + ';')();
                } catch (e) {
                    console.error('解析审核黑名单失败:', e);
                    config.auditorBlackList = [];
                }
            }

            // 解析推送地址
            const pushUrlMatch = configStr.match(/pushUrl\s*=\s*"([^"]+)"/);
            config.pushUrl = pushUrlMatch ? pushUrlMatch[1].trim() : '';

            // 解析手机号映射（新增）
            parseMobileMap(configStr);

            console.log('配置加载成功:', config);

            // 版本一致，继续加载功能函数
            loadRemoteFunctions(scriptContent);
        } else {
            console.error('未找到配置块');
            updateStatusDot('error');
            showError('远程配置格式错误');
        }
    }

    // 加载远程功能函数
    function loadRemoteFunctions(scriptContent) {
        // 提取函数部分
        const scriptMatch = scriptContent.match(/\/\* CONFIG END \*\/([\s\S]*)$/);
        if (scriptMatch) {
            try {
                const scriptCode = scriptMatch[1];
                remoteFunctions = new Function('getInfoData', 'config', 'callback', `
                    ${scriptCode}
                    return checkInfo(getInfoData, config, callback);
                `);
                console.log('远程函数创建成功');
                updateStatusDot('success');
            } catch (e) {
                console.error('创建远程函数失败:', e);
                updateStatusDot('error');
                throw e;
            }
        } else {
            console.error('未找到功能函数块');
            updateStatusDot('error');
            showError('远程功能函数格式错误');
        }
    }

    // 解析手机号映射
    function parseMobileMap(configStr) {
        // 查找手机号映射定义
        const mapMatch = configStr.match(/const\s+auditorMobileMap\s*=\s*\(function\(\)\s*\{[\s\S]*?\}\)\(\);/);

        if (mapMatch) {
            try {
                // 直接执行该函数获取映射
                const mapCode = mapMatch[0];
                config.auditorMobileMap = new Function('return ' + mapCode + ';')();
                console.log('审核人员手机号映射加载成功:', config.auditorMobileMap);
            } catch (e) {
                console.error('解析手机号映射失败:', e);
                // 尝试从白名单生成映射
                generateMobileMapFromWhiteList();
            }
        } else {
            console.warn('未找到显式的手机号映射配置，尝试从白名单生成');
            generateMobileMapFromWhiteList();
        }
    }

    // 从白名单生成手机号映射
    function generateMobileMapFromWhiteList() {
        config.auditorMobileMap = {};

        if (config.auditorWhiteList && Array.isArray(config.auditorWhiteList)) {
            config.auditorWhiteList.forEach(auditor => {
                if (auditor && auditor.name && auditor.mobile) {
                    config.auditorMobileMap[auditor.name] = auditor.mobile;
                }
            });
            console.log('从白名单生成的手机号映射:', config.auditorMobileMap);
        } else {
            console.warn('审核白名单格式不正确，无法生成手机号映射');
        }
    }

    // 创建开关按钮
    function createSwitchButton() {
        const container = document.createElement('div');
        container.className = 'ilabel-switch-container';
        container.title = '审核提醒开关（悬停查看状态）';

        const switchContainer = document.createElement('label');
        switchContainer.className = 'ilabel-switch';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = GM_getValue(SWITCH_KEY, true);

        const slider = document.createElement('span');
        slider.className = 'ilabel-switch-slider';

        // 保存状态变化
        checkbox.addEventListener('change', function() {
            GM_setValue(SWITCH_KEY, this.checked);
            updateSwitchTitle(container, checkbox);
            console.log('提醒状态:', this.checked ? '开启' : '关闭');
        });

        updateSwitchTitle(container, checkbox);

        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        container.appendChild(switchContainer);

        // 添加状态指示点
        const statusDot = document.createElement('div');
        statusDot.className = 'ilabel-status-dot loading';
        statusDot.setAttribute('id', 'ilabel-status-dot');
        container.appendChild(statusDot);

        // 添加版本信息提示
        const versionTooltip = document.createElement('div');
        versionTooltip.className = 'ilabel-version-tooltip';
        versionTooltip.id = 'ilabel-version-tooltip';
        updateVersionTooltip(versionTooltip);
        container.appendChild(versionTooltip);

        // 悬停显示详细信息
        let hoverTimeout;
        container.addEventListener('mouseenter', () => {
            hoverTimeout = setTimeout(() => {
                const status = checkbox.checked ? '开启' : '关闭';
                let configStatus = '未加载';
                if (config) {
                    configStatus = '已加载';
                    if (remoteVersion !== LOCAL_VERSION) {
                        configStatus += ` (版本不匹配: 本地${LOCAL_VERSION} 远程${remoteVersion})`;
                    }
                }
                container.title = `审核提醒: ${status} | 远程配置: ${configStatus}`;
                updateVersionTooltip(versionTooltip);
            }, 300);
        });

        container.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            updateSwitchTitle(container, checkbox);
        });

        return container;
    }

    // 更新开关标题
    function updateSwitchTitle(container, checkbox) {
        const status = checkbox.checked ? '提醒已开启' : '提醒已关闭';
        container.title = `审核提醒开关 - ${status}`;
    }

    // 更新版本提示
    function updateVersionTooltip(tooltip) {
        if (!remoteVersion) {
            tooltip.textContent = `本地版本: ${LOCAL_VERSION} (远程未加载)`;
        } else if (remoteVersion === LOCAL_VERSION) {
            tooltip.textContent = `版本一致: ${LOCAL_VERSION}`;
        } else {
            tooltip.textContent = `版本不匹配! 本地: ${LOCAL_VERSION} 远程: ${remoteVersion}`;
        }
    }

    // 更新状态点
    function updateStatusDot(status) {
        const statusDot = document.getElementById('ilabel-status-dot');
        if (statusDot) {
            statusDot.className = 'ilabel-status-dot ' + status;

            // 更新版本提示
            const tooltip = document.getElementById('ilabel-version-tooltip');
            if (tooltip) {
                updateVersionTooltip(tooltip);
            }

            // 成功状态2秒后隐藏
            if (status === 'success') {
                setTimeout(() => {
                    if (statusDot && statusDot.className.includes('success')) {
                        statusDot.style.display = 'none';
                    }
                }, 2000);
            }
        }
    }

    // 监听网络请求
    function setupRequestInterception() {
        // 监听fetch请求
        const originalFetch = window.fetch;
        if (originalFetch) {
            window.fetch = function(...args) {
                const url = args[0];

                if (typeof url === 'string' && url.includes('get_live_info_batch')) {
                    const fetchPromise = originalFetch.apply(this, args);

                    fetchPromise.then(response => {
                        if (response.ok) {
                            response.clone().json().then(data => {
                                if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                    processLiveInfo(data.liveInfoList[0]);
                                }
                            }).catch(() => {});
                        }
                    }).catch(() => {});

                    return fetchPromise;
                }

                return originalFetch.apply(this, args);
            };
        }

        // 监听XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            this._method = method;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            if (this._url && this._url.includes('get_live_info_batch')) {
                this.addEventListener('load', () => {
                    if (this.status === 200) {
                        try {
                            const data = JSON.parse(this.responseText);
                            if (data.ret === 0 && data.liveInfoList?.length > 0) {
                                processLiveInfo(data.liveInfoList[0]);
                            }
                        } catch (e) {
                            // 静默处理
                        }
                    }
                });
            }
            return originalSend.apply(this, arguments);
        };
    }

    // 处理直播信息
    async function processLiveInfo(liveInfo) {
        if (!remoteFunctions || !config) {
            return;
        }

        // 检查版本一致性
        if (remoteVersion !== LOCAL_VERSION) {
            console.warn('版本不一致，跳过处理');
            return;
        }

        try {
            const basicInfo = {
                liveid: liveInfo.liveId || '',
                description: liveInfo.description || '',
                nickname: liveInfo.nickname || '',
                signature: liveInfo.signature || '',
                authStatus: liveInfo.authStatus || '',
                createLiveArea: liveInfo.extraField?.createLiveArea || '',
                poiName: liveInfo.poiName || '',
                streamStartTime: liveInfo.streamStartTime || ''
            };

            basicInfo.auditor = await getAuditorInfo();
            basicInfo.audit_time = await getAuditTime();

            currentLiveData = basicInfo;

            // 调用远程处理函数
            remoteFunctions(basicInfo, config, displayResult);

        } catch (e) {
            console.error('处理直播信息失败:', e);
        }
    }

    // 获取审核人员信息
    async function getAuditorInfo() {
        try {
            const response = await fetch('https://ilabel.weixin.qq.com/api/user/info', {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && data.data?.name) {
                    const nameParts = data.data.name.split('-');
                    return nameParts.length > 1 ? nameParts[1].trim() : data.data.name.trim();
                }
            }
        } catch (e) {
            console.error('获取审核人员信息失败:', e);
        }
        return '';
    }

    // 获取送审时间
    async function getAuditTime() {
        try {
            const response = await fetch('https://ilabel.weixin.qq.com/api/mixed-task/assigned?task_id=10', {
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    'x-requested-with': 'XMLHttpRequest'
                },
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok' && data.data?.hits?.length > 0) {
                    const hit = data.data.hits[0];
                    return hit.content_data?.content?.audit_time || 0;
                }
            }
        } catch (e) {
            console.error('获取送审时间失败:', e);
        }
        return 0;
    }

    // 显示结果
    function displayResult(result) {
        if (!result || !result.message) return;

        // 保存结果类型
        currentResultType = result.type;

        // 1. 黑名单不显示任何弹窗
        if (result.type === 'blacklist') {
            console.log('审核人员在黑名单中，不显示弹窗');
            return;
        }

        // 2. 普通单只有在开关开启时才显示
        if (result.type === 'normal') {
            if (!GM_getValue(SWITCH_KEY, true)) {
                console.log('开关关闭，普通单不显示弹窗');
                return;
            }
        }

        // 3. 非普通单（prefilled、exempted、penalty）无论开关状态都显示
        createPopup(result);
    }

    // 创建弹窗
    function createPopup(result) {
        // 移除旧弹窗
        const oldPopup = document.getElementById('ilabel-alert-popup');
        if (oldPopup) oldPopup.remove();

        // 停止之前的监控
        if (popupCheckInterval) {
            clearInterval(popupCheckInterval);
        }

        // 设置颜色
        const colors = {
            prefilled: { bg: '#ffebee', border: '#f44336', text: '#c62828' },
            exempted: { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' },
            penalty: { bg: '#fff3e0', border: '#ff9800', text: '#ef6c00' },
            normal: { bg: '#f5f5f5', border: '#9e9e9e', text: '#424242' }
        };

        const color = colors[result.type] || colors.normal;

        const popup = document.createElement('div');
        popup.id = 'ilabel-alert-popup';
        popup.style.cssText = `
            background: ${color.bg} !important;
            border-color: ${color.border} !important;
            color: ${color.text} !important;
        `;

        // 标题
        const title = document.createElement('div');
        title.className = 'ilabel-popup-title';
        title.style.borderBottomColor = color.border;
        title.textContent = '直播审核提醒';

        // 内容
        const content = document.createElement('div');
        content.className = 'ilabel-popup-content';

        // 格式化时间
        const formatTime = (timestamp) => {
            if (!timestamp || timestamp === '0') return '未知';
            try {
                const date = new Date(parseInt(timestamp) * 1000);
                return date.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/\//g, '-');
            } catch (e) {
                return '时间格式错误';
            }
        };

        let contentHTML = `
            <div style="margin-bottom: 10px; padding: 8px; background: ${color.bg}40; border-radius: 4px;">
                <strong>提示:</strong> ${result.message}
            </div>
        `;

        if (currentLiveData) {
            // 计算时间差
            const streamTime = parseInt(currentLiveData.streamStartTime) || 0;
            const auditTime = parseInt(currentLiveData.audit_time) || 0;
            let timeDiffText = '';

            if (streamTime > 0 && auditTime > 0) {
                const diffMinutes = Math.round((auditTime - streamTime) / 60);
                timeDiffText = diffMinutes >= 0 ? ` (已开播${diffMinutes}分钟)` : ` (超前${Math.abs(diffMinutes)}分钟)`;
            }

            contentHTML += `
                <div style="margin-bottom: 8px;"><strong>直播ID:</strong>
                    <span class="ilabel-copy-liveid" onclick="this.copyLiveID('${currentLiveData.liveid}')">${currentLiveData.liveid}</span>
                </div>
                <div style="margin-bottom: 6px;"><strong>主播昵称:</strong> ${currentLiveData.nickname}</div>
                <div style="margin-bottom: 6px;"><strong>主播认证:</strong> ${currentLiveData.authStatus || '无认证'}</div>
                <div style="margin-bottom: 6px;"><strong>主播简介:</strong> ${currentLiveData.signature || '无'}</div>
                <div style="margin-bottom: 6px;"><strong>直播间描述:</strong> ${currentLiveData.description || '无'}</div>
                <div style="margin-bottom: 6px;"><strong>开播地:</strong> ${currentLiveData.createLiveArea || '未知'}</div>
                <div style="margin-bottom: 6px;"><strong>开播位置:</strong> ${currentLiveData.poiName || '未知'}</div>
                <div style="margin-bottom: 6px;"><strong>开播时间:</strong> ${formatTime(currentLiveData.streamStartTime)}${timeDiffText}</div>
                <div style="margin-bottom: 6px;"><strong>送审时间:</strong> ${formatTime(currentLiveData.audit_time)}</div>
                <div style="margin-bottom: 6px;"><strong>审核人员:</strong> ${currentLiveData.auditor || '未知'}</div>
            `;
        }

        content.innerHTML = contentHTML;

        // 添加复制函数
        content.querySelector('.ilabel-copy-liveid').copyLiveID = function(liveid) {
            navigator.clipboard.writeText(liveid).then(() => {
                const originalText = this.textContent;
                this.textContent = '已复制!';
                this.style.color = '#4caf50';
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.color = '#2196f3';
                }, 2000);
            });
        };

        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'ilabel-button-container';

        // 确认按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'ilabel-button';
        confirmBtn.textContent = '确认';
        confirmBtn.style.background = color.border;
        confirmBtn.style.color = 'white';

        confirmBtn.onclick = () => {
            popup.remove();
            popupConfirmed = true;
            lastPopupTime = null;
            if (popupCheckInterval) {
                clearInterval(popupCheckInterval);
                popupCheckInterval = null;
            }
        };

        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.className = 'ilabel-button';
        copyBtn.textContent = '复制直播ID';
        copyBtn.style.background = '#2196f3';
        copyBtn.style.color = 'white';

        copyBtn.onclick = () => {
            if (currentLiveData?.liveid) {
                navigator.clipboard.writeText(currentLiveData.liveid).then(() => {
                    copyBtn.textContent = '已复制!';
                    copyBtn.style.background = '#4caf50';
                    setTimeout(() => {
                        copyBtn.textContent = '复制直播ID';
                        copyBtn.style.background = '#2196f3';
                    }, 2000);
                });
            }
        };

        // 组装弹窗
        buttonContainer.appendChild(copyBtn);
        buttonContainer.appendChild(confirmBtn);
        popup.appendChild(title);
        popup.appendChild(content);
        popup.appendChild(buttonContainer);
        document.body.appendChild(popup);

        // 启动监控（10秒后推送）
        lastPopupTime = Date.now();
        popupConfirmed = false;
        monitorPopup();
    }

    // 监控弹窗（10秒后推送）
    function monitorPopup() {
        popupCheckInterval = setInterval(() => {
            const popupExists = !!document.getElementById('ilabel-alert-popup');
            const timeElapsed = Date.now() - lastPopupTime;

            // 10秒后检查并推送
            if (timeElapsed > 10000 && popupExists && currentLiveData && config) {
                const auditorName = currentLiveData.auditor;

                // 检查是否在白名单中
                const isInWhiteList = isAuditorInWhiteList(auditorName);

                // 推送条件：在白名单中且开关开启
                if (isInWhiteList && GM_getValue(SWITCH_KEY, true)) {
                    sendWeChatNotification(auditorName);
                    clearInterval(popupCheckInterval);
                    popupCheckInterval = null;
                } else if (isInWhiteList && !GM_getValue(SWITCH_KEY, true)) {
                    console.log('审核人员在白名单中，但开关关闭，不发送推送');
                    clearInterval(popupCheckInterval);
                    popupCheckInterval = null;
                }
            }

            // 如果弹窗已关闭，清理定时器
            if (!popupExists && popupCheckInterval) {
                clearInterval(popupCheckInterval);
                popupCheckInterval = null;
            }
        }, 1000); // 每1秒检查一次
    }

    // 检查审核人员是否在白名单中（支持新老格式）
    function isAuditorInWhiteList(auditorName) {
        if (!auditorName || !config) return false;

        // 检查新版对象数组格式
        if (config.auditorWhiteList && Array.isArray(config.auditorWhiteList)) {
            return config.auditorWhiteList.some(item => {
                if (item && item.name) {
                    return item.name === auditorName;
                }
                return false;
            });
        }

        // 检查老版字符串数组格式（兼容性）
        if (config.auditorNameList && Array.isArray(config.auditorNameList)) {
            return config.auditorNameList.includes(auditorName);
        }

        return false;
    }

    // 获取初判结果文本
    function getInitialJudgmentText() {
        switch (currentResultType) {
            case 'prefilled':
                return '预埋';
            case 'exempted':
                return '豁免';
            case 'penalty':
                return '违规';
            case 'normal':
                return '普通';
            default:
                return '其他';
        }
    }

    // 格式化时间为24小时制时分秒
    function formatTime24() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    // 发送企业微信通知
    function sendWeChatNotification(auditorName) {
        if (!config?.pushUrl) {
            console.error('推送地址未配置');
            return;
        }

        // 获取审核人员手机号
        const mentionedMobile = getAuditorMobile(auditorName);

        // 格式化推送内容：时间 + 初判结果 + 人员
        const timeStr = formatTime24();
        const judgmentText = getInitialJudgmentText();
        const content = `${timeStr} ${judgmentText}单未确认`;

        const data = {
            msgtype: "text",
            text: {
                content: content
            }
        };

        // 如果有手机号，添加@功能
        if (mentionedMobile) {
            data.text.mentioned_mobile_list = [mentionedMobile];
            console.log(`将@审核人员: ${auditorName} (手机号: ${mentionedMobile})`);
        } else {
            console.warn(`未找到审核人员 ${auditorName} 的手机号映射，将发送普通通知`);
        }

        console.log('发送企业微信通知:', data);

        GM_xmlhttpRequest({
            method: 'POST',
            url: config.pushUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            timeout: 5000,
            onload: function(response) {
                if (response.status === 200) {
                    console.log('企业微信通知发送成功');
                } else {
                    console.error('企业微信通知发送失败:', response.status, response.responseText);
                }
            },
            onerror: function(error) {
                console.error('企业微信通知发送错误:', error);
            }
        });
    }

    // 获取审核人员手机号
    function getAuditorMobile(auditorName) {
        if (!config || !config.auditorMobileMap) {
            console.warn('未配置审核人员手机号映射');
            return null;
        }

        // 查找审核人员的手机号
        const mobile = config.auditorMobileMap[auditorName];

        if (!mobile) {
            console.warn(`未找到审核人员 ${auditorName} 的手机号映射`);
            return null;
        }

        // 验证手机号格式（简单的11位数字验证）
        const mobileRegex = /^1[3-9]\d{9}$/;
        if (!mobileRegex.test(mobile)) {
            console.warn(`审核人员 ${auditorName} 的手机号格式不正确: ${mobile}`);
            return null;
        }

        return mobile;
    }

    // 显示错误提示
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'ilabel-error-toast';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // 监听页面变化
    function observePageChanges() {
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                // 页面变化时重新创建开关按钮
                setTimeout(() => {
                    const existingSwitch = document.querySelector('.ilabel-switch-container');
                    if (!existingSwitch) {
                        document.body.appendChild(createSwitchButton());
                    }
                }, 1000);
            }
        }).observe(document, { subtree: true, childList: true });
    }

    // 初始化
    function init() {
        console.log(`iLabel直播审核辅助工具 ${LOCAL_VERSION} 初始化...`);

        // 添加样式
        GM_addStyle(STYLES);

        // 立即开始加载远程脚本
        loadRemoteScript();

        // 等待DOM加载后添加开关按钮
        const addSwitch = () => {
            const switchBtn = createSwitchButton();
            document.body.appendChild(switchBtn);
            console.log('开关按钮已添加');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addSwitch);
        } else {
            addSwitch();
        }

        // 设置网络监听
        setupRequestInterception();

        // 监听页面变化
        observePageChanges();

        // 暴露开关状态获取方法
        window.getReminderStatus = () => GM_getValue(SWITCH_KEY, true);

        console.log('iLabel辅助工具初始化完成');
    }

    // 立即开始初始化
    init();
})();
