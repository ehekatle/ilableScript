// == iLabel直播质检单检测核心库 ==
// 版本: 1.5
// 远程库地址: https://github.com/ehekatle/ilableScript/blob/main/ilableScript.js
// 最后更新: 2025-12-15

(function(global) {
    'use strict';
    
    const iLabelQualityCheck = {
        // ============== 用户可配置开关 ==============
        config: {
            // 是否显示非质检单提示：0=不显示，1=显示
            SHOW_NON_QUALITY_TICKET: 0,
            
            // 白名单主播名称（空格分隔）
            WHITELIST_ANCHORS: "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博器",
            
            // 远程控制开关
            remoteControl: {
                enabled: true,
                configUrl: 'https://tes.com/ilable-config.json',
                checkInterval: 3600000, // 1小时检查一次
                lastCheck: 0
            }
        },
        
        // ============== 状态变量 ==============
        state: {
            initialized: false,
            observer: null,
            xhrInterceptorBound: false
        },
        
        // ============== 公共API ==============
        init: function() {
            if (this.state.initialized) {
                console.log('iLabel质检检测库已初始化');
                return;
            }
            
            console.log('iLabel直播质检单检测核心库 v1.5 加载成功');
            console.log('远程库地址: https://tes.com/ilable.js');
            
            // 从本地存储加载配置
            this.loadLocalConfig();
            
            // 检查远程配置更新
            this.checkRemoteConfig();
            
            // 初始化监听器
            this.initObserver();
            
            // 绑定XMLHttpRequest拦截器
            this.bindXHRInterceptor();
            
            // 设置定期检查远程配置
            this.setupConfigCheckInterval();
            
            this.state.initialized = true;
            
            // 检查是否已有API请求（页面加载时）
            setTimeout(() => {
                this.checkExistingRequests();
            }, 1000);
        },
        
        // 更新配置
        updateConfig: function(newConfig) {
            Object.assign(this.config, newConfig);
            this.saveLocalConfig();
            console.log('配置已更新:', this.config);
        },
        
        // ============== 配置管理 ==============
        loadLocalConfig: function() {
            try {
                if (typeof GM_getValue !== 'undefined') {
                    const savedConfig = GM_getValue('iLabelQualityConfig');
                    if (savedConfig) {
                        this.config.SHOW_NON_QUALITY_TICKET = savedConfig.SHOW_NON_QUALITY_TICKET || this.config.SHOW_NON_QUALITY_TICKET;
                        this.config.WHITELIST_ANCHORS = savedConfig.WHITELIST_ANCHORS || this.config.WHITELIST_ANCHORS;
                        console.log('从本地存储加载配置成功');
                    }
                }
            } catch (e) {
                console.error('加载本地配置失败:', e);
            }
        },
        
        saveLocalConfig: function() {
            try {
                if (typeof GM_setValue !== 'undefined') {
                    GM_setValue('iLabelQualityConfig', {
                        SHOW_NON_QUALITY_TICKET: this.config.SHOW_NON_QUALITY_TICKET,
                        WHITELIST_ANCHORS: this.config.WHITELIST_ANCHORS
                    });
                }
            } catch (e) {
                console.error('保存本地配置失败:', e);
            }
        },
        
        checkRemoteConfig: function() {
            if (!this.config.remoteControl.enabled) return;
            
            const now = Date.now();
            if (now - this.config.remoteControl.lastCheck < this.config.remoteControl.checkInterval) {
                return;
            }
            
            console.log('正在检查远程配置更新...');
            
            try {
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: this.config.remoteControl.configUrl,
                        timeout: 5000,
                        onload: (response) => {
                            if (response.status === 200) {
                                try {
                                    const remoteConfig = JSON.parse(response.responseText);
                                    this.processRemoteConfig(remoteConfig);
                                    this.config.remoteControl.lastCheck = now;
                                } catch (e) {
                                    console.error('解析远程配置失败:', e);
                                }
                            }
                        },
                        onerror: () => {
                            console.warn('无法连接到远程配置服务器');
                        },
                        ontimeout: () => {
                            console.warn('远程配置请求超时');
                        }
                    });
                }
            } catch (e) {
                console.error('远程配置检查失败:', e);
            }
        },
        
        processRemoteConfig: function(remoteConfig) {
            // 处理强制更新
            if (remoteConfig.forceUpdate) {
                console.log('检测到强制更新配置');
                this.updateConfig(remoteConfig);
                return;
            }
            
            // 处理版本检查
            if (remoteConfig.minVersion && remoteConfig.minVersion > 1.5) {
                console.warn(`检测到新版本要求: ${remoteConfig.minVersion}, 当前版本: 1.5`);
                this.showUpdateNotification(remoteConfig);
                return;
            }
            
            // 合并配置
            const mergedConfig = Object.assign({}, this.config, remoteConfig);
            this.updateConfig(mergedConfig);
            console.log('远程配置已应用');
        },
        
        showUpdateNotification: function(remoteConfig) {
            // 显示更新提示
            const notification = document.createElement('div');
            notification.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #ff6b6b;
                    color: white;
                    padding: 15px;
                    border-radius: 5px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 1000002;
                    max-width: 300px;
                ">
                    <strong>⚠️ 脚本需要更新</strong>
                    <p style="margin: 8px 0; font-size: 14px;">
                        检测到新版本要求，请更新脚本以继续使用完整功能。
                    </p>
                    ${remoteConfig.updateUrl ? `
                        <a href="${remoteConfig.updateUrl}" 
                           target="_blank"
                           style="
                               display: inline-block;
                               background: white;
                               color: #ff6b6b;
                               padding: 5px 10px;
                               border-radius: 3px;
                               text-decoration: none;
                               font-weight: bold;
                               margin-top: 5px;
                           ">
                            前往更新
                        </a>
                    ` : ''}
                    <button onclick="this.parentElement.parentElement.remove()"
                            style="
                                position: absolute;
                                top: 5px;
                                right: 5px;
                                background: transparent;
                                border: none;
                                color: white;
                                cursor: pointer;
                            ">
                        ×
                    </button>
                </div>
            `;
            document.body.appendChild(notification);
        },
        
        setupConfigCheckInterval: function() {
            // 每小时检查一次远程配置
            setInterval(() => {
                this.checkRemoteConfig();
            }, this.config.remoteControl.checkInterval);
        },
        
        // ============== 核心功能 ==============
        initObserver: function() {
            if (this.state.observer) {
                this.state.observer.disconnect();
            }
            
            this.state.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeName === 'SCRIPT' || node.nodeName === 'IFRAME') {
                                this.bindXHRInterceptor();
                            }
                        });
                    }
                });
            });
            
            this.state.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            console.log('DOM变化监听器已初始化');
        },
        
        bindXHRInterceptor: function() {
            if (this.state.xhrInterceptorBound) return;
            
            const self = this;
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;
            
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                this._requestURL = url;
                this._requestMethod = method;
                return originalXHROpen.apply(this, arguments);
            };
            
            XMLHttpRequest.prototype.send = function(...args) {
                const originalOnReadyStateChange = this.onreadystatechange;
                const originalOnLoad = this.onload;
                
                this.onreadystatechange = function() {
                    if (this.readyState === 4 && this.status === 200) {
                        self.handleResponse(this);
                    }
                    
                    if (originalOnReadyStateChange) {
                        originalOnReadyStateChange.apply(this, arguments);
                    }
                };
                
                this.onload = function() {
                    if (this.status === 200) {
                        self.handleResponse(this);
                    }
                    
                    if (originalOnLoad) {
                        originalOnLoad.apply(this, arguments);
                    }
                };
                
                return originalXHRSend.apply(this, args);
            };
            
            this.state.xhrInterceptorBound = true;
            console.log(`XMLHttpRequest拦截器已绑定，非质检单显示开关: ${this.config.SHOW_NON_QUALITY_TICKET === 1 ? '开启' : '关闭'}`);
        },
        
        handleResponse: function(xhr) {
            if (xhr._requestURL && xhr._requestURL.includes('get_live_info_batch')) {
                try {
                    const responseText = xhr.responseText;
                    if (responseText) {
                        const responseData = JSON.parse(responseText);
                        this.processLiveInfoResponse(responseData);
                    }
                } catch (err) {
                    console.error('解析响应数据失败:', err);
                }
            }
        },
        
        isWhitelistAnchor: function(nickname) {
            if (!nickname) return { isWhitelist: false, nickname: '' };
            
            const whitelistArray = this.config.WHITELIST_ANCHORS.split(' ');
            const decodedNickname = this.decodeUnicode(nickname);
            
            for (const anchorName of whitelistArray) {
                if (decodedNickname.includes(anchorName)) {
                    return {
                        isWhitelist: true,
                        matchedName: anchorName,
                        nickname: decodedNickname
                    };
                }
            }
            
            return { isWhitelist: false, nickname: decodedNickname };
        },
        
        isMediaEnterprise: function(authStatus) {
            if (!authStatus) return false;
            
            const decodedAuthStatus = this.decodeUnicode(authStatus);
            return decodedAuthStatus.includes('事业媒体');
        },
        
        processLiveInfoResponse: function(data) {
            if (data && data.ret === 0 && data.liveInfoList && data.liveInfoList.length > 0) {
                const liveInfo = data.liveInfoList[0];
                
                if (liveInfo.streamStartTime) {
                    const streamStartDate = new Date(parseInt(liveInfo.streamStartTime) * 1000);
                    const currentDate = new Date();
                    
                    const isSameDay =
                        streamStartDate.getFullYear() === currentDate.getFullYear() &&
                        streamStartDate.getMonth() === currentDate.getMonth() &&
                        streamStartDate.getDate() === currentDate.getDate();
                    
                    // 检查豁免条件
                    const whitelistCheck = this.isWhitelistAnchor(liveInfo.nickname);
                    const isMediaEnterpriseCheck = this.isMediaEnterprise(liveInfo.authStatus);
                    
                    // 豁免处理
                    if (isSameDay) {
                        let exemptionType = null;
                        
                        if (whitelistCheck.isWhitelist) {
                            exemptionType = '白名单豁免';
                        } else if (isMediaEnterpriseCheck) {
                            exemptionType = '事业媒体豁免';
                        }
                        
                        if (exemptionType) {
                            console.log(`发现豁免条件: ${exemptionType}`);
                            this.showExemptionNotification(isSameDay, streamStartDate, liveInfo, exemptionType, whitelistCheck);
                            return;
                        }
                    }
                    
                    // 根据开关决定是否处理非质检单
                    if (isSameDay && this.config.SHOW_NON_QUALITY_TICKET === 0) {
                        console.log('检测到非质检单，根据开关设置不显示提示');
                        return;
                    }
                    
                    // 显示手动关闭的提示
                    this.showManualCloseNotification(isSameDay, streamStartDate, liveInfo, null, null);
                    
                    // 在控制台输出详细信息
                    this.logLiveInfo(liveInfo, streamStartDate, currentDate, isSameDay);
                }
            }
        },
        
        logLiveInfo: function(liveInfo, streamStartDate, currentDate, isSameDay) {
            console.log('直播信息分析:');
            console.log('直播ID:', liveInfo.liveId);
            console.log('直播名称:', this.decodeUnicode(liveInfo.liveName));
            console.log('主播认证状态:', this.decodeUnicode(liveInfo.authStatus));
            console.log('开始时间戳:', liveInfo.streamStartTime);
            console.log('开始时间:', streamStartDate.toLocaleString());
            console.log('当前时间:', currentDate.toLocaleString());
            console.log('是否为今天:', isSameDay ? '是' : '否');
            console.log('检测结果:', isSameDay ? '非质检单' : '质检单');
            console.log('当前开关设置:', this.config.SHOW_NON_QUALITY_TICKET === 1 ? '显示所有提示' : '仅显示质检单');
        },
        
        // ============== UI 相关 ==============
        showExemptionNotification: function(isSameDay, streamStartDate, liveInfo, exemptionType, whitelistCheck) {
            const existingNotification = document.getElementById('custom-notification');
            if (existingNotification) existingNotification.remove();
            
            const notification = this.createNotificationElement();
            const exemptionColor = '#ffc107';
            const exemptionBackground = '#fff3cd';
            const exemptionBorder = '#ffeaa7';
            const authStatusText = this.decodeUnicode(liveInfo.authStatus) || '未认证';
            const authStatusColor = authStatusText === '未认证' ? '#6c757d' : '#17a2b8';
            
            let exemptionInfo = '';
            if (exemptionType === '白名单豁免' && whitelistCheck) {
                exemptionInfo = `匹配白名单: ${whitelistCheck.matchedName}`;
            } else if (exemptionType === '事业媒体豁免') {
                exemptionInfo = '认证包含: 事业媒体';
            }
            
            notification.innerHTML = this.getExemptionNotificationHTML(
                exemptionType,
                exemptionInfo,
                liveInfo,
                authStatusText,
                authStatusColor,
                streamStartDate,
                exemptionColor,
                exemptionBackground,
                exemptionBorder
            );
            
            this.setupNotificationEvents(notification, liveInfo, true);
        },
        
        showManualCloseNotification: function(isSameDay, streamStartDate, liveInfo, exemptionType, whitelistCheck) {
            const existingNotification = document.getElementById('custom-notification');
            if (existingNotification) existingNotification.remove();
            
            const notification = this.createNotificationElement();
            const message = isSameDay ? '非质检单' : '质检单';
            const color = isSameDay ? 'green' : 'red';
            const backgroundColor = isSameDay ? '#d1e7dd' : '#f8d7da';
            const borderColor = isSameDay ? '#badbcc' : '#f5c6cb';
            const textColor = isSameDay ? '#0f5132' : '#721c24';
            const buttonColor = isSameDay ? '#198754' : '#dc3545';
            const authStatusText = this.decodeUnicode(liveInfo.authStatus) || '未认证';
            const authStatusColor = authStatusText === '未认证' ? '#6c757d' : '#17a2b8';
            
            notification.innerHTML = this.getManualCloseNotificationHTML(
                message,
                liveInfo,
                authStatusText,
                authStatusColor,
                streamStartDate,
                color,
                backgroundColor,
                borderColor,
                textColor,
                buttonColor,
                isSameDay
            );
            
            this.setupNotificationEvents(notification, liveInfo, false);
        },
        
        createNotificationElement: function() {
            const notification = document.createElement('div');
            notification.id = 'custom-notification';
            return notification;
        },
        
        getExemptionNotificationHTML: function(exemptionType, exemptionInfo, liveInfo, authStatusText, authStatusColor, streamStartDate, exemptionColor, exemptionBackground, exemptionBorder) {
            const formattedStartTime = streamStartDate.toLocaleString();
            const now = new Date().toLocaleString();
            
            return `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 550px;
                    padding: 25px;
                    background-color: white;
                    border: 3px solid ${exemptionBorder};
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    z-index: 1000000;
                    font-family: Arial, sans-serif;
                ">
                    <div style="
                        font-size: 24px;
                        font-weight: bold;
                        color: #856404;
                        margin-bottom: 15px;
                        text-align: center;
                        padding-bottom: 10px;
                        border-bottom: 2px solid ${exemptionBorder};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        🛡️ ${exemptionType}
                    </div>

                    <div style="
                        background-color: ${exemptionBackground};
                        padding: 12px;
                        border-radius: 5px;
                        margin-bottom: 15px;
                        border-left: 4px solid ${exemptionColor};
                        color: #856404;
                        font-weight: bold;
                        text-align: center;
                    ">
                        ${exemptionInfo}
                    </div>

                    ${this.getLiveInfoHTML(liveInfo, authStatusText, authStatusColor)}

                    <div style="margin-bottom: 15px;">
                        <div style="font-weight: bold; margin-bottom: 5px;">时间信息:</div>
                        <div style="display: flex; margin-bottom: 3px;">
                            <span style="min-width: 120px;">直播开始时间:</span>
                            <span>${formattedStartTime}</span>
                        </div>
                        <div style="display: flex;">
                            <span style="min-width: 120px;">当前系统时间:</span>
                            <span>${now}</span>
                        </div>
                    </div>

                    <div style="
                        background-color: #e2e3e5;
                        padding: 12px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                        border-left: 4px solid #d6d8db;
                        font-size: 14px;
                        color: #383d41;
                    ">
                        <strong>判断结果:</strong> 该直播是今天开始的，但符合豁免条件，无需质检
                    </div>

                    <div style="text-align: center;">
                        <button id="close-notification-btn" style="
                            padding: 12px 40px;
                            background-color: ${exemptionColor};
                            color: #856404;
                            border: none;
                            border-radius: 6px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s;
                            margin-bottom: 8px;
                        ">
                            确认并复制ID
                        </button>

                        <div style="
                            font-size: 12px;
                            color: #666;
                            font-style: italic;
                        ">
                            点击按钮将复制直播ID并关闭提示
                        </div>
                    </div>
                </div>

                <div id="notification-overlay" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                    z-index: 999999;
                "></div>
            `;
        },
        
        getManualCloseNotificationHTML: function(message, liveInfo, authStatusText, authStatusColor, streamStartDate, color, backgroundColor, borderColor, textColor, buttonColor, isSameDay) {
            const formattedStartTime = streamStartDate.toLocaleString();
            const now = new Date().toLocaleString();
            
            return `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 520px;
                    padding: 25px;
                    background-color: white;
                    border: 2px solid ${borderColor};
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    z-index: 1000000;
                    font-family: Arial, sans-serif;
                ">
                    <div style="
                        font-size: 24px;
                        font-weight: bold;
                        color: ${textColor};
                        margin-bottom: 15px;
                        text-align: center;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        ${isSameDay ? '✅' : '⚠️'} ${message}
                    </div>

                    ${this.getLiveInfoHTML(liveInfo, authStatusText, authStatusColor)}

                    <div style="margin-bottom: 15px;">
                        <div style="font-weight: bold; margin-bottom: 5px;">时间信息:</div>
                        <div style="display: flex; margin-bottom: 3px;">
                            <span style="min-width: 120px;">直播开始时间:</span>
                            <span>${formattedStartTime}</span>
                        </div>
                        <div style="display: flex;">
                            <span style="min-width: 120px;">当前系统时间:</span>
                            <span>${now}</span>
                        </div>
                    </div>

                    <div style="
                        background-color: ${backgroundColor};
                        padding: 12px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                        border-left: 4px solid ${borderColor};
                        font-size: 14px;
                    ">
                        <strong>判断结果:</strong> ${isSameDay ?
                            '该直播是今天开始的，属于非质检单' :
                            '该直播不是今天开始的，属于质检单'}
                    </div>

                    <div style="text-align: center;">
                        <button id="close-notification-btn" style="
                            padding: 12px 40px;
                            background-color: ${buttonColor};
                            color: white;
                            border: none;
                            border-radius: 6px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s;
                            margin-bottom: 8px;
                        ">
                            确认并复制ID
                        </button>

                        <div style="
                            font-size: 12px;
                            color: #666;
                            font-style: italic;
                        ">
                            点击按钮将复制直播ID并关闭提示
                        </div>
                    </div>
                </div>

                <div id="notification-overlay" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                    z-index: 999999;
                "></div>
            `;
        },
        
        getLiveInfoHTML: function(liveInfo, authStatusText, authStatusColor) {
            return `
                <div style="margin-bottom: 15px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">直播信息:</div>
                    <div style="display: flex; margin-bottom: 3px;">
                        <span style="min-width: 80px;">直播名称:</span>
                        <span>${this.decodeUnicode(liveInfo.liveName)}</span>
                    </div>
                    <div style="display: flex; margin-bottom: 3px;">
                        <span style="min-width: 80px;">主播:</span>
                        <span>${this.decodeUnicode(liveInfo.nickname)}</span>
                    </div>
                    <div style="display: flex; margin-bottom: 3px;">
                        <span style="min-width: 80px;">认证状态:</span>
                        <span style="
                            background-color: ${authStatusColor};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-size: 12px;
                            font-weight: bold;
                        ">${authStatusText}</span>
                    </div>
                    <div style="display: flex; margin-top: 8px; align-items: flex-start;">
                        <span style="min-width: 80px; font-weight: bold;">直播ID:</span>
                        <div style="flex: 1;">
                            <span id="liveId-value" style="
                                background-color: #f0f0f0;
                                padding: 4px 10px;
                                border-radius: 4px;
                                font-family: 'Courier New', monospace;
                                cursor: pointer;
                                border: 1px solid #ddd;
                                display: inline-block;
                                font-size: 14px;
                                word-break: break-all;
                            " title="点击复制">${liveInfo.liveId}</span>
                        </div>
                    </div>
                </div>
            `;
        },
        
        setupNotificationEvents: function(notification, liveInfo, isExemption) {
            document.body.appendChild(notification);
            
            setTimeout(() => {
                const closeBtn = document.getElementById('close-notification-btn');
                const overlay = document.getElementById('notification-overlay');
                const liveIdElement = document.getElementById('liveId-value');
                
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        this.copyToClipboard(liveInfo.liveId);
                        this.showCopySuccess(liveInfo.liveId, false, isExemption);
                        setTimeout(() => notification.remove(), 300);
                    };
                }
                
                if (overlay) {
                    overlay.onclick = () => notification.remove();
                }
                
                if (liveIdElement) {
                    liveIdElement.onclick = () => {
                        this.copyToClipboard(liveInfo.liveId);
                        this.showCopySuccess(liveInfo.liveId, true, isExemption);
                    };
                }
                
                // ESC键关闭
                document.addEventListener('keydown', function closeOnEsc(e) {
                    if (e.key === 'Escape') {
                        notification.remove();
                        document.removeEventListener('keydown', closeOnEsc);
                    }
                });
            }, 100);
        },
        
        copyToClipboard: function(text) {
            try {
                if (typeof GM_setClipboard !== 'undefined') {
                    GM_setClipboard(text, 'text');
                    return true;
                }
                
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text);
                    return true;
                }
                
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch (err) {
                console.error('复制失败:', err);
                return false;
            }
        },
        
        showCopySuccess: function(liveId, isClickCopy, isExemption) {
            const existingMsg = document.getElementById('copy-success-message');
            if (existingMsg) existingMsg.remove();
            
            const successMsg = document.createElement('div');
            successMsg.id = 'copy-success-message';
            const backgroundColor = isExemption ? '#ffc107' : '#28a745';
            const textColor = isExemption ? '#856404' : 'white';
            
            successMsg.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    background-color: ${backgroundColor};
                    color: ${textColor};
                    border-radius: 5px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 1000001;
                    animation: slideInRight 0.3s ease-out;
                ">
                    <div style="display: flex; align-items: center;">
                        <span style="margin-right: 8px; font-size: 18px;">${isExemption ? '🛡️' : '✅'}</span>
                        <div>
                            <div style="font-weight: bold;">${isExemption ? '豁免' : '复制'}成功</div>
                            <div style="font-size: 12px; margin-top: 2px;">
                                ${isClickCopy ? '点击复制' : '按钮复制'}: ${liveId}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(successMsg);
            
            setTimeout(() => {
                successMsg.style.opacity = '0';
                successMsg.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (successMsg.parentNode) {
                        successMsg.parentNode.removeChild(successMsg);
                    }
                }, 500);
            }, 3000);
        },
        
        decodeUnicode: function(str) {
            if (!str) return '';
            return str.replace(/\\u([\d\w]{4})/gi, function(match, grp) {
                return String.fromCharCode(parseInt(grp, 16));
            });
        },
        
        checkExistingRequests: function() {
            console.log('脚本初始化完成，开始监控API请求');
        }
    };
    
    // 暴露到全局
    global.iLabelQualityCheck = iLabelQualityCheck;
    
    // 自动初始化（如果环境允许）
    if (document.readyState === 'complete') {
        setTimeout(() => {
            if (!iLabelQualityCheck.state.initialized) {
                iLabelQualityCheck.init();
            }
        }, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (!iLabelQualityCheck.state.initialized) {
                    iLabelQualityCheck.init();
                }
            }, 1000);
        });
    }
    
    // 防止脚本被卸载
    global.addEventListener('beforeunload', function() {
        setTimeout(() => {
            if (iLabelQualityCheck.state.initialized) {
                iLabelQualityCheck.bindXHRInterceptor();
            }
        }, 100);
    });
    

})(window);

