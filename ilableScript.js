// == iLabel直播质检单检测核心库 ==
// 版本: 2.7
// 远程库地址: https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilableScript.js
// GitHub仓库: https://github.com/ehekatle/ilableScript
// 最后更新: 2024-12-15

(function(global) {
    'use strict';
    
    // ============== 远程配置 ==============
    const REMOTE_CONFIG = {
        // 是否显示非质检单提示：0=不显示，1=显示
        SHOW_NON_QUALITY_TICKET: 1,
        
        // 白名单主播名称（空格分隔）
        WHITELIST_ANCHORS: "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博器",
        
        // 企业微信推送配置
        WECHAT_WEBHOOK: {
            // 默认推送地址
            default: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb",
            // 人员列表配置（用户ID: 企业微信用户ID）
            users: {
                // 示例配置：用户ID需要与API返回的anchorUserId匹配
                // "13104806698664615": {
                //     name: "王鹏程",
                //     wecomId: "@all"  // 使用@all通知所有人，或具体用户ID如"WangPengCheng"
                // }
            },
            // 推送开关：true=开启，false=关闭
            enabled: true,
            // 首次超时时间（毫秒）
            firstTimeout: 60000, // 1分钟
            // 重复推送间隔（毫秒）
            repeatInterval: 60000, // 1分钟
            // 最大推送次数（0表示无限制）
            maxPushCount: 10,
            // 是否启用@提醒
            enableMention: true,
            // 是否启用重复推送
            enableRepeatPush: true,
            // 如果没有配置用户是否推送
            pushIfNoUser: false
        },
        
        // 远程控制配置
        remoteControl: {
            enabled: true,
            configUrls: [
                'https://raw.githubusercontent.com/ehekatle/ilableScript/main/config.json',
                'https://gitee.com/ehekatle/ilableScript/raw/main/config.json'
            ],
            checkInterval: 3600000,
            lastCheck: 0,
            fallbackToLocal: true
        },
        
        // 版本信息
        version: {
            major: 2,
            minor: 7,
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
            soundAlert: false,
            timeoutPush: true // 超时推送开关
        },
        
        // 外观配置
        ui: {
            notificationWidth: 550,
            colors: {
                qualityTicket: '#dc3545',
                nonQualityTicket: '#198754',
                exemption: '#ffc107',
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
            lastLiveInfo: null,
            activeNotification: null,
            notificationTimer: null,
            repeatPushTimer: null,
            pendingPush: null,
            pushCount: 0
        },
        
        // ============== 公共API ==============
        init: function() {
            if (this.state.initialized) {
                this.log('iLabel质检检测库已初始化');
                return;
            }
            
            this.log('iLabel直播质检单检测核心库 v' + this.config.version.toString() + ' 加载成功');
            
            // 从本地存储加载配置
            this.loadLocalConfig();
            
            // 检查远程配置更新
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
            
            this.state.initialized = true;
            
            // 检查是否已有API请求
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
                        if (savedConfig.version && savedConfig.version.major >= 2) {
                            this.updateConfig(savedConfig);
                            this.log('从本地存储加载配置成功（v2格式）');
                        } else {
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
            
            this.tryRemoteConfigSources(0);
        },
        
        tryRemoteConfigSources: function(index) {
            if (index >= this.config.remoteControl.configUrls.length) {
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
            if (remoteConfig.forceUpdate) {
                this.log('检测到强制更新配置');
                this.updateConfig(remoteConfig);
                this.showForceUpdateNotification(remoteConfig);
                return;
            }
            
            if (remoteConfig.minVersion && this.compareVersions(remoteConfig.minVersion, this.config.version.toString()) > 0) {
                this.warn(`检测到新版本要求: ${remoteConfig.minVersion}, 当前版本: ${this.config.version.toString()}`);
                this.showUpdateNotification(remoteConfig);
                return;
            }
            
            const currentVersion = this.config.version;
            this.deepMerge(this.config, remoteConfig);
            this.config.version = currentVersion;
            
            this.saveLocalConfig();
            
            this.log('远程配置已应用');
            
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
            setInterval(() => {
                this.checkRemoteConfig();
            }, this.config.remoteControl.checkInterval);
        },
        
        // ============== 超时推送功能 ==============
        startNotificationTimer: function(liveInfo, notificationType, isExemption = false) {
            // 检查是否需要推送
            if (!this.shouldPushNotification(liveInfo.anchorUserId)) {
                this.log('该用户未配置推送，跳过定时器设置');
                return;
            }
            
            this.clearNotificationTimers();
            
            if (!this.config.features.timeoutPush || !this.config.WECHAT_WEBHOOK.enabled) {
                return;
            }
            
            this.state.pendingPush = {
                liveInfo: liveInfo,
                type: notificationType,
                isExemption: isExemption,
                startTime: Date.now(),
                lastPushTime: 0
            };
            
            this.state.pushCount = 0;
            
            // 设置首次超时推送
            this.state.notificationTimer = setTimeout(() => {
                this.sendPushNotification('首次');
                
                if (this.config.WECHAT_WEBHOOK.enableRepeatPush) {
                    this.startRepeatPushTimer();
                }
            }, this.config.WECHAT_WEBHOOK.firstTimeout);
            
            this.log(`已设置${this.config.WECHAT_WEBHOOK.firstTimeout/1000}秒首次推送计时器`);
        },
        
        shouldPushNotification: function(userId) {
            // 检查用户是否在推送列表中
            const userInfo = this.config.WECHAT_WEBHOOK.users[userId];
            
            if (userInfo) {
                this.log(`用户 ${userId} 已配置推送，配置信息:`, userInfo);
                return true;
            }
            
            // 如果用户不在列表中，检查是否允许推送
            if (this.config.WECHAT_WEBHOOK.pushIfNoUser) {
                this.log(`用户 ${userId} 未配置，但配置允许无用户推送`);
                return true;
            }
            
            this.log(`用户 ${userId} 未配置推送，且配置不允许无用户推送，跳过推送`);
            return false;
        },
        
        startRepeatPushTimer: function() {
            if (!this.state.pendingPush) {
                return;
            }
            
            if (this.state.repeatPushTimer) {
                clearInterval(this.state.repeatPushTimer);
                this.state.repeatPushTimer = null;
            }
            
            this.state.repeatPushTimer = setInterval(() => {
                if (this.config.WECHAT_WEBHOOK.maxPushCount > 0 && 
                    this.state.pushCount >= this.config.WECHAT_WEBHOOK.maxPushCount) {
                    this.log(`已达到最大推送次数${this.config.WECHAT_WEBHOOK.maxPushCount}，停止重复推送`);
                    this.clearNotificationTimers();
                    return;
                }
                
                this.sendPushNotification('重复');
            }, this.config.WECHAT_WEBHOOK.repeatInterval);
            
            this.log(`已设置${this.config.WECHAT_WEBHOOK.repeatInterval/1000}秒重复推送定时器`);
        },
        
        clearNotificationTimers: function() {
            if (this.state.notificationTimer) {
                clearTimeout(this.state.notificationTimer);
                this.state.notificationTimer = null;
            }
            
            if (this.state.repeatPushTimer) {
                clearInterval(this.state.repeatPushTimer);
                this.state.repeatPushTimer = null;
            }
            
            this.state.pushCount = 0;
            this.state.pendingPush = null;
            
            this.log('已清除所有推送计时器');
        },
        
        sendPushNotification: function(pushType) {
            if (!this.state.pendingPush) {
                return;
            }
            
            const { liveInfo, type, isExemption } = this.state.pendingPush;
            
            // 再次检查是否需要推送
            if (!this.shouldPushNotification(liveInfo.anchorUserId)) {
                this.log('用户不在推送列表中，取消推送');
                this.clearNotificationTimers();
                return;
            }
            
            const liveName = this.decodeUnicode(liveInfo.liveName);
            const anchorName = this.decodeUnicode(liveInfo.nickname);
            const liveId = liveInfo.liveId;
            
            let qualityType = '';
            if (isExemption) {
                qualityType = '豁免单';
            } else if (type === 'quality') {
                qualityType = '质检单';
            } else {
                qualityType = '非质检单';
            }
            
            const userInfo = this.getUserInfo(liveInfo.anchorUserId);
            const mentionText = this.config.WECHAT_WEBHOOK.enableMention ? 
                (userInfo.wecomId || '@all') : '';
            
            const startTime = this.state.pendingPush.startTime;
            const currentTime = Date.now();
            const elapsedMinutes = Math.floor((currentTime - startTime) / 60000);
            
            const message = {
                msgtype: "markdown",
                markdown: {
                    content: `## 📢 iLabel质检单提醒 (${pushType})\n\n` +
                            `**你有新单，初判为：${qualityType}**\n\n` +
                            `**直播信息：**\n` +
                            `- 直播名称：${liveName}\n` +
                            `- 主播：${anchorName}\n` +
                            `- 直播ID：\`${liveId}\`\n` +
                            `- 判定时间：${new Date(startTime).toLocaleString('zh-CN')}\n` +
                            `- 未处理时长：${elapsedMinutes}分钟\n\n` +
                            `**处理状态：** <font color="warning">仍未处理</font>\n\n` +
                            (pushType === '重复' ? `**推送次数：** 第${this.state.pushCount + 1}次\n\n` : '') +
                            (mentionText ? `${mentionText} 请尽快处理！` : '请尽快处理！')
                }
            };
            
            this.sendWechatWebhook(message);
            
            this.state.pushCount++;
            this.state.pendingPush.lastPushTime = currentTime;
            
            this.log(`${pushType}推送成功，推送次数: ${this.state.pushCount}`);
        },
        
        getUserInfo: function(userId) {
            // 返回配置的用户信息，如果没有则返回默认
            const userInfo = this.config.WECHAT_WEBHOOK.users[userId];
            if (userInfo) {
                return userInfo;
            }
            
            return {
                name: "未配置用户",
                wecomId: ""
            };
        },
        
        sendWechatWebhook: function(message) {
            if (!this.config.WECHAT_WEBHOOK.enabled) {
                return;
            }
            
            const webhookUrl = this.config.WECHAT_WEBHOOK.default;
            
            try {
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: webhookUrl,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        data: JSON.stringify(message),
                        timeout: 10000,
                        onload: (response) => {
                            if (response.status === 200) {
                                this.log('企业微信推送成功');
                            } else {
                                this.error('企业微信推送失败:', response.status, response.responseText);
                            }
                        },
                        onerror: (error) => {
                            this.error('企业微信推送请求失败:', error);
                        },
                        ontimeout: () => {
                            this.error('企业微信推送请求超时');
                        }
                    });
                } else {
                    fetch(webhookUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(message),
                        mode: 'cors'
                    })
                    .then(response => {
                        if (response.ok) {
                            this.log('企业微信推送成功');
                        } else {
                            this.error('企业微信推送失败:', response.status);
                        }
                    })
                    .catch(error => {
                        this.error('企业微信推送错误:', error);
                    });
                }
            } catch (e) {
                this.error('企业微信推送异常:', e);
            }
        },
        
        // ============== 核心功能 ==============
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
            
            const pushInfo = this.shouldPushNotification(liveInfo.anchorUserId) ? 
                '<div style="margin-top: 8px; font-size: 12px; color: #666; font-style: italic;">⏰ 1分钟内未处理将自动推送提醒</div>' : 
                '<div style="margin-top: 8px; font-size: 12px; color: #999; font-style: italic;">⚠️ 该用户未配置推送，不会发送提醒</div>';
            
            notification.innerHTML = this.getExemptionNotificationHTML(
                exemptionType,
                exemptionInfo,
                liveInfo,
                authStatusText,
                authStatusColor,
                streamStartDate,
                exemptionColor,
                exemptionBackground,
                exemptionBorder,
                pushInfo
            );
            
            this.setupNotificationEvents(notification, liveInfo, true, 'exemption');
            
            this.startNotificationTimer(liveInfo, 'exemption', true);
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
            const pushType = isSameDay ? '非质检单' : '质检单';
            
            const pushInfo = this.shouldPushNotification(liveInfo.anchorUserId) ? 
                `<div style="margin-top: 8px; font-size: 12px; color: #666; font-style: italic;">⏰ 1分钟内未处理将推送"${pushType}"提醒</div>` : 
                '<div style="margin-top: 8px; font-size: 12px; color: #999; font-style: italic;">⚠️ 该用户未配置推送，不会发送提醒</div>';
            
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
                isSameDay,
                pushInfo
            );
            
            this.setupNotificationEvents(notification, liveInfo, false, isSameDay ? 'non-quality' : 'quality');
            
            this.startNotificationTimer(liveInfo, isSameDay ? 'non-quality' : 'quality', false);
        },
        
        setupNotificationEvents: function(notification, liveInfo, isExemption, notificationType) {
            document.body.appendChild(notification);
            this.state.activeNotification = notification;
            
            setTimeout(() => {
                const closeBtn = document.getElementById('close-notification-btn');
                const overlay = document.getElementById('notification-overlay');
                const liveIdElement = document.getElementById('liveId-value');
                
                const handleClose = () => {
                    this.clearNotificationTimers();
                    
                    if (this.config.features.autoCopy) {
                        this.copyToClipboard(liveInfo.liveId);
                        this.showCopySuccess(liveInfo.liveId, false, isExemption);
                    }
                    
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                            this.state.activeNotification = null;
                        }
                    }, 300);
                };
                
                if (closeBtn) {
                    closeBtn.onclick = handleClose;
                }
                
                if (overlay) {
                    overlay.onclick = handleClose;
                }
                
                if (liveIdElement) {
                    liveIdElement.onclick = () => {
                        this.copyToClipboard(liveInfo.liveId);
                        this.showCopySuccess(liveInfo.liveId, true, isExemption);
                    };
                }
                
                document.addEventListener('keydown', function closeOnEsc(e) {
                    if (e.key === 'Escape') {
                        this.clearNotificationTimers();
                        
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                            this.state.activeNotification = null;
                        }
                        document.removeEventListener('keydown', closeOnEsc);
                    }
                }.bind(this));
            }, 100);
        },
        
        getExemptionNotificationHTML: function(exemptionType, exemptionInfo, liveInfo, authStatusText, authStatusColor, streamStartDate, exemptionColor, exemptionBackground, exemptionBorder, pushInfo) {
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
                        ${pushInfo}
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
        
        getManualCloseNotificationHTML: function(message, liveInfo, authStatusText, authStatusColor, streamStartDate, color, backgroundColor, borderColor, textColor, buttonColor, isSameDay, pushInfo) {
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
                        ${pushInfo}
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
        
        hexToRgba: function(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        },
        
        // ============== 原有的其他函数 ==============
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
                    
                    const whitelistCheck = this.isWhitelistAnchor(liveInfo.nickname);
                    const isMediaEnterpriseCheck = this.isMediaEnterprise(liveInfo.authStatus);
                    
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
                    
                    if (isSameDay && this.config.SHOW_NON_QUALITY_TICKET === 0) {
                        this.log('检测到非质检单，根据开关设置不显示提示');
                        return;
                    }
                    
                    this.showManualCloseNotification(isSameDay, streamStartDate, liveInfo, null, null);
                    
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
        
        createNotificationElement: function() {
            const notification = document.createElement('div');
            notification.id = 'custom-notification';
            return notification;
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
        
        showForceUpdateNotification: function(remoteConfig) {
            // 简化实现，保持代码长度
            this.log('显示强制更新通知');
        },
        
        showUpdateNotification: function(remoteConfig) {
            this.log('显示更新通知');
        },
        
        showConfigUpdateNotification: function(message) {
            if (!this.config.features.showNotifications) return;
            this.log('显示配置更新通知:', message);
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
