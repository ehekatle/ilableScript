// == iLabel直播质检单检测核心库 ==
// 版本: 2.0
// 远程库地址: https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilableScript.js
// GitHub仓库: https://github.com/ehekatle/ilableScript
// 最后更新: 2024-01-01

(function(global) {
    'use strict';
    
    // ============== 远程配置 ==============
    const REMOTE_CONFIG = {
        // 是否显示非质检单提示：0=不显示，1=显示
        SHOW_NON_QUALITY_TICKET: 1,
        
        // 白名单主播名称（空格分隔）
        WHITELIST_ANCHORS: "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博器",
        
        // 远程控制配置
        remoteControl: {
            enabled: true,
            configUrls: [
                'https://raw.githubusercontent.com/ehekatle/ilableScript/main/config.json',
                'https://gitee.com/ehekatle/ilableScript/raw/main/config.json'
            ],
            checkInterval: 3600000, // 1小时检查一次
            lastCheck: 0,
            fallbackToLocal: true // 网络失败时回退到本地配置
        },
        
        // 版本信息
        version: {
            major: 2,
            minor: 0,
            patch: 0,
            toString: function() {
                return `${this.major}.${this.minor}.${this.patch}`;
            }
        },
        
        // 功能开关
        features: {
            debugMode: false,
            autoCopy: true,
            showNotifications: true,
            soundAlert: false
        },
        
        // 外观配置
        ui: {
            notificationWidth: 550,
            colors: {
                qualityTicket: '#dc3545', // 质检单颜色
                nonQualityTicket: '#198754', // 非质检单颜色
                exemption: '#ffc107', // 豁免颜色
                success: '#28a745',
                warning: '#ffc107',
                danger: '#dc3545'
            },
            animation: true,
            darkMode: false
        }
    };
    
    const iLabelQualityCheck = {
        // ============== 当前配置 ==============
        config: JSON.parse(JSON.stringify(REMOTE_CONFIG)),
        
        // ============== 状态变量 ==============
        state: {
            initialized: false,
            observer: null,
            xhrInterceptorBound: false,
            requestsCount: 0,
            lastLiveInfo: null
        },
        
        // ============== 公共API ==============
        init: function() {
            if (this.state.initialized) {
                console.log('iLabel质检检测库已初始化');
                return;
            }
            
            this.log('iLabel直播质检单检测核心库 v' + this.config.version.toString() + ' 加载成功');
            this.log('远程库地址: https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilableScript.js');
            this.log('GitHub仓库: https://github.com/ehekatle/ilableScript');
            
            // 从本地存储加载配置
            this.loadLocalConfig();
            
            // 检查远程配置更新（异步进行，不阻塞初始化）
            setTimeout(() => {
                this.checkRemoteConfig();
            }, 2000);
            
            // 初始化监听器
            this.initObserver();
            
            // 绑定XMLHttpRequest拦截器
            this.bindXHRInterceptor();
            
            // 设置定期检查远程配置
            this.setupConfigCheckInterval();
            
            // 添加全局CSS样式
            this.addGlobalStyles();
            
            // 添加调试面板（仅在调试模式下）
            if (this.config.features.debugMode) {
                this.addDebugPanel();
            }
            
            this.state.initialized = true;
            
            // 检查是否已有API请求（页面加载时）
            setTimeout(() => {
                this.checkExistingRequests();
            }, 1000);
        },
        
        // 更新配置
        updateConfig: function(newConfig) {
            // 深拷贝合并配置
            this.deepMerge(this.config, newConfig);
            this.saveLocalConfig();
            this.log('配置已更新:', this.config);
            
            // 如果调试模式发生变化，更新调试面板
            if (newConfig.features && newConfig.features.debugMode !== undefined) {
                if (newConfig.features.debugMode && !document.getElementById('debug-panel')) {
                    this.addDebugPanel();
                } else if (!newConfig.features.debugMode && document.getElementById('debug-panel')) {
                    document.getElementById('debug-panel').remove();
                }
            }
        },
        
        // 获取当前配置
        getConfig: function() {
            return JSON.parse(JSON.stringify(this.config));
        },
        
        // ============== 配置管理 ==============
        loadLocalConfig: function() {
            try {
                if (typeof GM_getValue !== 'undefined') {
                    const savedConfig = GM_getValue('iLabelQualityConfig_v2');
                    if (savedConfig) {
                        // 验证版本
                        if (savedConfig.version && savedConfig.version.major >= 2) {
                            this.updateConfig(savedConfig);
                            this.log('从本地存储加载配置成功（v2格式）');
                        } else {
                            // 旧版本配置，只迁移基本设置
                            const migratedConfig = {
                                SHOW_NON_QUALITY_TICKET: savedConfig.SHOW_NON_QUALITY_TICKET || this.config.SHOW_NON_QUALITY_TICKET,
                                WHITELIST_ANCHORS: savedConfig.WHITELIST_ANCHORS || this.config.WHITELIST_ANCHORS
                            };
                            this.updateConfig(migratedConfig);
                            this.log('已从旧版本配置迁移');
                        }
                    }
                }
            } catch (e) {
                this.error('加载本地配置失败:', e);
            }
        },
        
        saveLocalConfig: function() {
            try {
                if (typeof GM_setValue !== 'undefined') {
                    GM_setValue('iLabelQualityConfig_v2', this.config);
                    this.log('配置已保存到本地存储');
                }
            } catch (e) {
                this.error('保存本地配置失败:', e);
            }
        },
        
        checkRemoteConfig: function() {
            if (!this.config.remoteControl.enabled) {
                this.log('远程控制已禁用，使用本地配置');
                return;
            }
            
            const now = Date.now();
            if (now - this.config.remoteControl.lastCheck < this.config.remoteControl.checkInterval) {
                return;
            }
            
            this.log('正在检查远程配置更新...');
            
            // 尝试多个配置源
            this.tryRemoteConfigSources(0);
        },
        
        tryRemoteConfigSources: function(index) {
            if (index >= this.config.remoteControl.configUrls.length) {
                // 所有源都失败
                if (this.config.remoteControl.fallbackToLocal) {
                    this.log('所有远程配置源都失败，使用本地配置');
                } else {
                    this.warn('所有远程配置源都失败');
                }
                return;
            }
            
            const url = this.config.remoteControl.configUrls[index];
            
            try {
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: url,
                        timeout: 8000,
                        onload: (response) => {
                            if (response.status === 200) {
                                try {
                                    const remoteConfig = JSON.parse(response.responseText);
                                    this.processRemoteConfig(remoteConfig);
                                    this.config.remoteControl.lastCheck = Date.now();
                                    this.log(`从 ${new URL(url).hostname} 成功获取远程配置`);
                                } catch (e) {
                                    this.error('解析远程配置失败:', e);
                                    this.tryRemoteConfigSources(index + 1);
                                }
                            } else {
                                this.warn(`配置源 ${url} 返回状态码: ${response.status}`);
                                this.tryRemoteConfigSources(index + 1);
                            }
                        },
                        onerror: () => {
                            this.warn(`配置源 ${url} 请求失败`);
                            this.tryRemoteConfigSources(index + 1);
                        },
                        ontimeout: () => {
                            this.warn(`配置源 ${url} 请求超时`);
                            this.tryRemoteConfigSources(index + 1);
                        }
                    });
                } else {
                    // 降级方案：使用fetch API
                    this.fetchRemoteConfig(url, index);
                }
            } catch (e) {
                this.error('远程配置请求异常:', e);
                this.tryRemoteConfigSources(index + 1);
            }
        },
        
        fetchRemoteConfig: function(url, index) {
            fetch(url, { mode: 'cors', timeout: 8000 })
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error(`HTTP ${response.status}`);
                })
                .then(remoteConfig => {
                    this.processRemoteConfig(remoteConfig);
                    this.config.remoteControl.lastCheck = Date.now();
                    this.log(`从 ${new URL(url).hostname} 成功获取远程配置`);
                })
                .catch(error => {
                    this.warn(`配置源 ${url} 失败: ${error.message}`);
                    this.tryRemoteConfigSources(index + 1);
                });
        },
        
        processRemoteConfig: function(remoteConfig) {
            // 检查强制更新
            if (remoteConfig.forceUpdate) {
                this.log('检测到强制更新配置');
                this.updateConfig(remoteConfig);
                this.showForceUpdateNotification(remoteConfig);
                return;
            }
            
            // 检查版本要求
            if (remoteConfig.minVersion && this.compareVersions(remoteConfig.minVersion, this.config.version.toString()) > 0) {
                this.warn(`检测到新版本要求: ${remoteConfig.minVersion}, 当前版本: ${this.config.version.toString()}`);
                this.showUpdateNotification(remoteConfig);
                return;
            }
            
            // 合并配置（保留当前配置的版本信息）
            const currentVersion = this.config.version;
            this.deepMerge(this.config, remoteConfig);
            this.config.version = currentVersion; // 保持版本不变
            
            // 保存到本地
            this.saveLocalConfig();
            
            this.log('远程配置已应用');
            
            // 显示配置更新通知
            if (remoteConfig.updateMessage) {
                this.showConfigUpdateNotification(remoteConfig.updateMessage);
            }
        },
        
        compareVersions: function(v1, v2) {
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            
            for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                const part1 = parts1[i] || 0;
                const part2 = parts2[i] || 0;
                if (part1 !== part2) {
                    return part1 - part2;
                }
            }
            return 0;
        },
        
        deepMerge: function(target, source) {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    this.deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
            return target;
        },
        
        setupConfigCheckInterval: function() {
            // 每小时检查一次远程配置
            setInterval(() => {
                this.checkRemoteConfig();
            }, this.config.remoteControl.checkInterval);
        },
        
        // ============== 通知系统 ==============
        showForceUpdateNotification: function(remoteConfig) {
            const html = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
                    z-index: 1000003;
                    max-width: 350px;
                    border-left: 5px solid #ff3838;
                ">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 24px; margin-right: 10px;">🚨</span>
                        <strong style="font-size: 16px;">强制更新通知</strong>
                    </div>
                    <p style="margin: 10px 0; font-size: 14px; line-height: 1.5;">
                        ${remoteConfig.updateMessage || '检测到重要更新，需要更新脚本以继续使用。'}
                    </p>
                    ${remoteConfig.updateUrl ? `
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <a href="${remoteConfig.updateUrl}" 
                               target="_blank"
                               style="
                                   flex: 1;
                                   background: white;
                                   color: #ff6b6b;
                                   padding: 8px 15px;
                                   border-radius: 5px;
                                   text-decoration: none;
                                   font-weight: bold;
                                   text-align: center;
                                   transition: all 0.3s;
                               "
                               onmouseover="this.style.transform='translateY(-2px)';"
                               onmouseout="this.style.transform='translateY(0)';">
                               立即更新
                            </a>
                            <button onclick="this.closest('[style]').remove()"
                                    style="
                                        padding: 8px 15px;
                                        background: rgba(255, 255, 255, 0.2);
                                        border: 1px solid rgba(255, 255, 255, 0.3);
                                        color: white;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-weight: bold;
                                        transition: all 0.3s;
                                    "
                                    onmouseover="this.style.background='rgba(255, 255, 255, 0.3)';"
                                    onmouseout="this.style.background='rgba(255, 255, 255, 0.2)';">
                                忽略
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            
            const notification = document.createElement('div');
            notification.innerHTML = html;
            document.body.appendChild(notification.firstElementChild);
            
            // 10分钟后自动移除
            setTimeout(() => {
                if (notification.firstElementChild && notification.firstElementChild.parentNode) {
                    notification.firstElementChild.parentNode.removeChild(notification.firstElementChild);
                }
            }, 600000);
        },
        
        showUpdateNotification: function(remoteConfig) {
            const html = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #4ecdc4, #44a08d);
                    color: white;
                    padding: 18px;
                    border-radius: 8px;
                    box-shadow: 0 6px 20px rgba(78, 205, 196, 0.3);
                    z-index: 1000002;
                    max-width: 320px;
                    border-left: 5px solid #2ecc71;
                ">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 22px; margin-right: 10px;">📢</span>
                        <strong style="font-size: 15px;">版本更新可用</strong>
                    </div>
                    <p style="margin: 8px 0; font-size: 13px; line-height: 1.4;">
                        发现新版本 v${remoteConfig.minVersion}，建议更新以获得更好的体验和功能。
                    </p>
                    ${remoteConfig.updateUrl ? `
                        <a href="${remoteConfig.updateUrl}" 
                           target="_blank"
                           style="
                               display: inline-block;
                               background: white;
                               color: #4ecdc4;
                               padding: 6px 12px;
                               border-radius: 4px;
                               text-decoration: none;
                               font-weight: bold;
                               margin-top: 10px;
                               transition: all 0.3s;
                               font-size: 13px;
                           "
                           onmouseover="this.style.transform='translateY(-2px)';"
                           onmouseout="this.style.transform='translateY(0)';">
                           查看更新
                        </a>
                    ` : ''}
                    <button onclick="this.closest('[style]').remove()"
                            style="
                                position: absolute;
                                top: 10px;
                                right: 10px;
                                background: transparent;
                                border: none;
                                color: white;
                                cursor: pointer;
                                font-size: 18px;
                                opacity: 0.7;
                                transition: opacity 0.3s;
                            "
                            onmouseover="this.style.opacity='1';"
                            onmouseout="this.style.opacity='0.7';">
                        ×
                    </button>
                </div>
            `;
            
            const notification = document.createElement('div');
            notification.innerHTML = html;
            document.body.appendChild(notification.firstElementChild);
            
            // 5分钟后自动移除
            setTimeout(() => {
                if (notification.firstElementChild && notification.firstElementChild.parentNode) {
                    notification.firstElementChild.parentNode.removeChild(notification.firstElementChild);
                }
            }, 300000);
        },
        
        showConfigUpdateNotification: function(message) {
            if (!this.config.features.showNotifications) return;
            
            const html = `
                <div style="
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    padding: 15px;
                    border-radius: 6px;
                    box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
                    z-index: 1000001;
                    max-width: 300px;
                    animation: slideInRight 0.3s ease-out;
                ">
                    <div style="display: flex; align-items: center;">
                        <span style="font-size: 20px; margin-right: 8px;">⚙️</span>
                        <div>
                            <div style="font-weight: bold; font-size: 14px;">配置已更新</div>
                            <div style="font-size: 12px; margin-top: 4px; opacity: 0.9;">${message}</div>
                        </div>
                    </div>
                </div>
            `;
            
            const notification = document.createElement('div');
            notification.innerHTML = html;
            document.body.appendChild(notification.firstElementChild);
            
            // 3秒后自动移除
            setTimeout(() => {
                if (notification.firstElementChild && notification.firstElementChild.parentNode) {
                    notification.firstElementChild.parentNode.removeChild(notification.firstElementChild);
                }
            }, 3000);
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
            
            this.log('DOM变化监听器已初始化');
        },
        
        bindXHRInterceptor: function() {
            if (this.state.xhrInterceptorBound) return;
            
            const self = this;
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;
            
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                this._requestURL = url;
                this._requestMethod = method;
                this._requestId = Date.now() + Math.random().toString(36).substr(2, 9);
                return originalXHROpen.apply(this, arguments);
            };
            
            XMLHttpRequest.prototype.send = function(...args) {
                const requestId = this._requestId;
                const url = this._requestURL;
                
                if (url && url.includes('get_live_info_batch')) {
                    self.state.requestsCount++;
                    self.log(`拦截到API请求 #${self.state.requestsCount}: ${url}`);
                }
                
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
            this.log(`XMLHttpRequest拦截器已绑定，非质检单显示开关: ${this.config.SHOW_NON_QUALITY_TICKET === 1 ? '开启' : '关闭'}`);
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
                    this.error('解析响应数据失败:', err);
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
                this.state.lastLiveInfo = liveInfo;
                
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
                            this.log(`发现豁免条件: ${exemptionType}`);
                            this.showExemptionNotification(isSameDay, streamStartDate, liveInfo, exemptionType, whitelistCheck);
                            return;
                        }
                    }
                    
                    // 根据开关决定是否处理非质检单
                    if (isSameDay && this.config.SHOW_NON_QUALITY_TICKET === 0) {
                        this.log('检测到非质检单，根据开关设置不显示提示');
                        return;
                    }
                    
                    // 显示手动关闭的提示
                    this.showManualCloseNotification(isSameDay, streamStartDate, liveInfo, null, null);
                    
                    // 在控制台输出详细信息
                    if (this.config.features.debugMode) {
                        this.logLiveInfo(liveInfo, streamStartDate, currentDate, isSameDay);
                    }
                }
            }
        },
        
        logLiveInfo: function(liveInfo, streamStartDate, currentDate, isSameDay) {
            this.log('直播信息分析:');
            this.log('直播ID:', liveInfo.liveId);
            this.log('直播名称:', this.decodeUnicode(liveInfo.liveName));
            this.log('主播认证状态:', this.decodeUnicode(liveInfo.authStatus));
            this.log('开始时间戳:', liveInfo.streamStartTime);
            this.log('开始时间:', streamStartDate.toLocaleString());
            this.log('当前时间:', currentDate.toLocaleString());
            this.log('是否为今天:', isSameDay ? '是' : '否');
            this.log('检测结果:', isSameDay ? '非质检单' : '质检单');
            this.log('当前开关设置:', this.config.SHOW_NON_QUALITY_TICKET === 1 ? '显示所有提示' : '仅显示质检单');
        },
        
        // ============== UI 相关 ==============
        showExemptionNotification: function(isSameDay, streamStartDate, liveInfo, exemptionType, whitelistCheck) {
            if (!this.config.features.showNotifications) return;
            
            const existingNotification = document.getElementById('custom-notification');
            if (existingNotification) existingNotification.remove();
            
            const notification = this.createNotificationElement();
            const colors = this.config.ui.colors;
            const exemptionColor = colors.exemption;
            const exemptionBackground = this.hexToRgba(exemptionColor, 0.1);
            const exemptionBorder = this.hexToRgba(exemptionColor, 0.3);
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
            if (!this.config.features.showNotifications) return;
            
            const existingNotification = document.getElementById('custom-notification');
            if (existingNotification) existingNotification.remove();
            
            const notification = this.createNotificationElement();
            const message = isSameDay ? '非质检单' : '质检单';
            const colors = this.config.ui.colors;
            const color = isSameDay ? colors.nonQualityTicket : colors.qualityTicket;
            const backgroundColor = this.hexToRgba(color, 0.1);
            const borderColor = this.hexToRgba(color, 0.3);
            const textColor = this.config.ui.darkMode ? '#ffffff' : (isSameDay ? '#0f5132' : '#721c24');
            const buttonColor = color;
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
        
        hexToRgba: function(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        },
        
        createNotificationElement: function() {
            const notification = document.createElement('div');
            notification.id = 'custom-notification';
            return notification;
        },
        
        getExemptionNotificationHTML: function(exemptionType, exemptionInfo, liveInfo, authStatusText, authStatusColor, streamStartDate, exemptionColor, exemptionBackground, exemptionBorder) {
            const formattedStartTime = streamStartDate.toLocaleString();
            const now = new Date().toLocaleString();
            const width = this.config.ui.notificationWidth;
            
            return `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: ${width}px;
                    padding: 25px;
                    background-color: ${this.config.ui.darkMode ? '#2d3436' : 'white'};
                    border: 3px solid ${exemptionBorder};
                    border-radius: 12px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.4);
                    z-index: 1000000;
                    font-family: 'Microsoft YaHei', Arial, sans-serif;
                    color: ${this.config.ui.darkMode ? '#ffffff' : '#333333'};
                    ${this.config.ui.animation ? 'animation: fadeInScale 0.3s ease-out;' : ''}
                ">
                    <div style="
                        font-size: 24px;
                        font-weight: bold;
                        color: ${exemptionColor};
                        margin-bottom: 15px;
                        text-align: center;
                        padding-bottom: 10px;
                        border-bottom: 2px solid ${exemptionBorder};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <span style="font-size: 28px;">🛡️</span>
                        <span>${exemptionType}</span>
                    </div>

                    <div style="
                        background-color: ${exemptionBackground};
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        border-left: 5px solid ${exemptionColor};
                        color: ${exemptionColor};
                        font-weight: bold;
                        text-align: center;
                        font-size: 15px;
                    ">
                        ${exemptionInfo}
                    </div>

                    ${this.getLiveInfoHTML(liveInfo, authStatusText, authStatusColor)}

                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: bold; margin-bottom: 8px; color: ${exemptionColor};">时间信息:</div>
                        <div style="display: flex; margin-bottom: 6px; align-items: center;">
                            <span style="min-width: 130px; font-weight: 500;">直播开始时间:</span>
                            <span style="
                                background: ${this.hexToRgba(exemptionColor, 0.1)};
                                padding: 4px 10px;
                                border-radius: 4px;
                                flex: 1;
                            ">${formattedStartTime}</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="min-width: 130px; font-weight: 500;">当前系统时间:</span>
                            <span style="
                                background: ${this.hexToRgba(exemptionColor, 0.1)};
                                padding: 4px 10px;
                                border-radius: 4px;
                                flex: 1;
                            ">${now}</span>
                        </div>
                    </div>

                    <div style="
                        background-color: ${this.config.ui.darkMode ? '#3d4446' : '#e2e3e5'};
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                        border-left: 5px solid ${this.config.ui.darkMode ? '#4a5153' : '#d6d8db'};
                        font-size: 14px;
                        color: ${this.config.ui.darkMode ? '#bdc3c7' : '#383d41'};
                    ">
                        <strong style="color: ${exemptionColor};">判断结果:</strong> 该直播是今天开始的，但符合豁免条件，无需质检
                    </div>

                    <div style="text-align: center;">
                        <button id="close-notification-btn" style="
                            padding: 12px 45px;
                            background: linear-gradient(135deg, ${exemptionColor}, ${this.adjustColorBrightness(exemptionColor, -20)});
                            color: #856404;
                            border: none;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s;
                            margin-bottom: 10px;
                            box-shadow: 0 4px 15px ${this.hexToRgba(exemptionColor, 0.3)};
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px ${this.hexToRgba(exemptionColor, 0.4)}';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px ${this.hexToRgba(exemptionColor, 0.3)}';">
                            确认并复制ID
                        </button>

                        <div style="
                            font-size: 13px;
                            color: ${this.config.ui.darkMode ? '#95a5a6' : '#666'};
                            font-style: italic;
                            opacity: 0.8;
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
                    background-color: rgba(0,0,0,0.6);
                    z-index: 999999;
                    ${this.config.ui.animation ? 'animation: fadeIn 0.3s ease-out;' : ''}
                "></div>
            `;
        },
        
        getManualCloseNotificationHTML: function(message, liveInfo, authStatusText, authStatusColor, streamStartDate, color, backgroundColor, borderColor, textColor, buttonColor, isSameDay) {
            const formattedStartTime = streamStartDate.toLocaleString();
            const now = new Date().toLocaleString();
            const width = this.config.ui.notificationWidth;
            const icon = isSameDay ? '✅' : '⚠️';
            
            return `
                <div style="
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: ${width}px;
                    padding: 25px;
                    background-color: ${this.config.ui.darkMode ? '#2d3436' : 'white'};
                    border: 2px solid ${borderColor};
                    border-radius: 12px;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.4);
                    z-index: 1000000;
                    font-family: 'Microsoft YaHei', Arial, sans-serif;
                    color: ${this.config.ui.darkMode ? '#ffffff' : '#333333'};
                    ${this.config.ui.animation ? 'animation: fadeInScale 0.3s ease-out;' : ''}
                ">
                    <div style="
                        font-size: 24px;
                        font-weight: bold;
                        color: ${textColor};
                        margin-bottom: 15px;
                        text-align: center;
                        padding-bottom: 10px;
                        border-bottom: 1px solid ${this.config.ui.darkMode ? '#4a5153' : '#eee'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        <span style="font-size: 28px;">${icon}</span>
                        <span>${message}</span>
                    </div>

                    ${this.getLiveInfoHTML(liveInfo, authStatusText, authStatusColor)}

                    <div style="margin-bottom: 20px;">
                        <div style="font-weight: bold; margin-bottom: 8px; color: ${color};">时间信息:</div>
                        <div style="display: flex; margin-bottom: 6px; align-items: center;">
                            <span style="min-width: 130px; font-weight: 500;">直播开始时间:</span>
                            <span style="
                                background: ${backgroundColor};
                                padding: 4px 10px;
                                border-radius: 4px;
                                flex: 1;
                                border: 1px solid ${borderColor};
                            ">${formattedStartTime}</span>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <span style="min-width: 130px; font-weight: 500;">当前系统时间:</span>
                            <span style="
                                background: ${backgroundColor};
                                padding: 4px 10px;
                                border-radius: 4px;
                                flex: 1;
                                border: 1px solid ${borderColor};
                            ">${now}</span>
                        </div>
                    </div>

                    <div style="
                        background-color: ${backgroundColor};
                        padding: 15px;
                        border-radius: 8px;
                        margin-bottom: 25px;
                        border-left: 5px solid ${borderColor};
                        font-size: 14px;
                        color: ${textColor};
                    ">
                        <strong style="color: ${color};">判断结果:</strong> ${isSameDay ?
                            '该直播是今天开始的，属于非质检单' :
                            '该直播不是今天开始的，属于质检单'}
                    </div>

                    <div style="text-align: center;">
                        <button id="close-notification-btn" style="
                            padding: 12px 45px;
                            background: linear-gradient(135deg, ${buttonColor}, ${this.adjustColorBrightness(buttonColor, -20)});
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s;
                            margin-bottom: 10px;
                            box-shadow: 0 4px 15px ${this.hexToRgba(buttonColor, 0.3)};
                        "
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px ${this.hexToRgba(buttonColor, 0.4)}';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px ${this.hexToRgba(buttonColor, 0.3)}';">
                            确认并复制ID
                        </button>

                        <div style="
                            font-size: 13px;
                            color: ${this.config.ui.darkMode ? '#95a5a6' : '#666'};
                            font-style: italic;
                            opacity: 0.8;
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
                    background-color: rgba(0,0,0,0.6);
                    z-index: 999999;
                    ${this.config.ui.animation ? 'animation: fadeIn 0.3s ease-out;' : ''}
                "></div>
            `;
        },
        
        getLiveInfoHTML: function(liveInfo, authStatusText, authStatusColor) {
            return `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: bold; margin-bottom: 8px; color: ${this.config.ui.colors.exemption};">直播信息:</div>
                    <div style="display: flex; margin-bottom: 6px; align-items: center;">
                        <span style="min-width: 80px; font-weight: 500;">直播名称:</span>
                        <span style="
                            background: ${this.config.ui.darkMode ? '#3d4446' : '#f8f9fa'};
                            padding: 6px 12px;
                            border-radius: 6px;
                            flex: 1;
                            border: 1px solid ${this.config.ui.darkMode ? '#4a5153' : '#e9ecef'};
                            word-break: break-word;
                        ">${this.decodeUnicode(liveInfo.liveName)}</span>
                    </div>
                    <div style="display: flex; margin-bottom: 6px; align-items: center;">
                        <span style="min-width: 80px; font-weight: 500;">主播:</span>
                        <span style="
                            background: ${this.config.ui.darkMode ? '#3d4446' : '#f8f9fa'};
                            padding: 6px 12px;
                            border-radius: 6px;
                            flex: 1;
                            border: 1px solid ${this.config.ui.darkMode ? '#4a5153' : '#e9ecef'};
                            word-break: break-word;
                        ">${this.decodeUnicode(liveInfo.nickname)}</span>
                    </div>
                    <div style="display: flex; margin-bottom: 6px; align-items: center;">
                        <span style="min-width: 80px; font-weight: 500;">认证状态:</span>
                        <span style="
                            background-color: ${authStatusColor};
                            color: white;
                            padding: 6px 15px;
                            border-radius: 20px;
                            font-size: 13px;
                            font-weight: bold;
                            letter-spacing: 0.5px;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        ">${authStatusText}</span>
                    </div>
                    <div style="display: flex; margin-top: 12px; align-items: flex-start;">
                        <span style="min-width: 80px; font-weight: bold; color: ${this.config.ui.colors.exemption};">直播ID:</span>
                        <div style="flex: 1;">
                            <span id="liveId-value" style="
                                background-color: ${this.config.ui.darkMode ? '#3d4446' : '#f0f0f0'};
                                padding: 8px 15px;
                                border-radius: 8px;
                                font-family: 'Courier New', monospace;
                                cursor: pointer;
                                border: 1px solid ${this.config.ui.darkMode ? '#4a5153' : '#ddd'};
                                display: inline-block;
                                font-size: 14px;
                                word-break: break-all;
                                transition: all 0.3s;
                                color: ${this.config.ui.darkMode ? '#ffffff' : '#333'};
                            " 
                            title="点击复制"
                            onmouseover="this.style.backgroundColor='${this.config.ui.darkMode ? '#4a5153' : '#e9ecef'}';"
                            onmouseout="this.style.backgroundColor='${this.config.ui.darkMode ? '#3d4446' : '#f0f0f0'}';">
                                ${liveInfo.liveId}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        },
        
        adjustColorBrightness: function(hex, percent) {
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            
            return '#' + (
                0x1000000 +
                (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255)
            ).toString(16).slice(1);
        },
        
        setupNotificationEvents: function(notification, liveInfo, isExemption) {
            document.body.appendChild(notification);
            
            setTimeout(() => {
                const closeBtn = document.getElementById('close-notification-btn');
                const overlay = document.getElementById('notification-overlay');
                const liveIdElement = document.getElementById('liveId-value');
                
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        if (this.config.features.autoCopy) {
                            this.copyToClipboard(liveInfo.liveId);
                            this.showCopySuccess(liveInfo.liveId, false, isExemption);
                        }
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
                this.error('复制失败:', err);
                return false;
            }
        },
        
        showCopySuccess: function(liveId, isClickCopy, isExemption) {
            if (!this.config.features.showNotifications) return;
            
            const existingMsg = document.getElementById('copy-success-message');
            if (existingMsg) existingMsg.remove();
            
            const successMsg = document.createElement('div');
            successMsg.id = 'copy-success-message';
            const colors = this.config.ui.colors;
            const backgroundColor = isExemption ? colors.exemption : colors.success;
            const textColor = isExemption ? '#856404' : 'white';
            
            successMsg.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, ${backgroundColor}, ${this.adjustColorBrightness(backgroundColor, -10)});
                    color: ${textColor};
                    border-radius: 8px;
                    box-shadow: 0 6px 20px ${this.hexToRgba(backgroundColor, 0.3)};
                    z-index: 1000001;
                    animation: slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border-left: 4px solid ${this.adjustColorBrightness(backgroundColor, -20)};
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 22px;">${isExemption ? '🛡️' : '✅'}</span>
                        <div>
                            <div style="font-weight: bold; font-size: 15px; margin-bottom: 2px;">
                                ${isExemption ? '豁免' : '复制'}成功
                            </div>
                            <div style="font-size: 12px; opacity: 0.9;">
                                ${isClickCopy ? '点击复制' : '按钮复制'}: ${liveId}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(successMsg);
            
            // 3秒后自动移除
            setTimeout(() => {
                successMsg.style.opacity = '0';
                successMsg.style.transform = 'translateX(100%)';
                successMsg.style.transition = 'all 0.5s ease-in-out';
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
        
        // ============== 工具函数 ==============
        log: function(...args) {
            if (this.config.features.debugMode) {
                console.log('[iLabel质检检测]', ...args);
            }
        },
        
        warn: function(...args) {
            console.warn('[iLabel质检检测]', ...args);
        },
        
        error: function(...args) {
            console.error('[iLabel质检检测]', ...args);
        },
        
        checkExistingRequests: function() {
            this.log('脚本初始化完成，开始监控API请求');
        },
        
        addGlobalStyles: function() {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeInScale {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        },
        
        addDebugPanel: function() {
            const panel = document.createElement('div');
            panel.id = 'debug-panel';
            panel.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                z-index: 999999;
                max-width: 300px;
                max-height: 200px;
                overflow: auto;
            `;
            
            panel.innerHTML = `
                <div style="margin-bottom: 5px; font-weight: bold;">iLabel质检检测调试面板</div>
                <div>版本: v${this.config.version.toString()}</div>
                <div>请求数: <span id="debug-request-count">0</span></div>
                <div>最后直播ID: <span id="debug-last-liveid">无</span></div>
                <div>显示非质检单: ${this.config.SHOW_NON_QUALITY_TICKET === 1 ? '是' : '否'}</div>
            `;
            
            document.body.appendChild(panel);
            
            // 更新调试信息
            setInterval(() => {
                if (panel.parentNode) {
                    const requestCount = document.getElementById('debug-request-count');
                    const lastLiveId = document.getElementById('debug-last-liveid');
                    
                    if (requestCount) {
                        requestCount.textContent = this.state.requestsCount;
                    }
                    
                    if (lastLiveId && this.state.lastLiveInfo) {
                        lastLiveId.textContent = this.state.lastLiveInfo.liveId;
                    }
                }
            }, 1000);
        }
    };
    
    // 暴露到全局
    global.iLabelQualityCheck = iLabelQualityCheck;
    
    // 自动初始化
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
