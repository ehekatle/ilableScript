// ==UserScript==
// @name         iLabel推送功能测试脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  测试远程库推送功能的用户端脚本
// @author       caloneis
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('iLabel推送测试脚本开始执行');
    
    // ==================== 样式定义 ====================
    const STYLES = `
        .ilabel-test-notification {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000000;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            min-width: 500px;
            max-width: 600px;
            font-family: 'Microsoft YaHei', sans-serif;
            overflow: hidden;
            animation: popupFadeIn 0.3s ease;
        }
        
        @keyframes popupFadeIn {
            from { opacity: 0; transform: translate(-50%, -60%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
        }
        
        .ilabel-test-header {
            padding: 16px 20px;
            font-weight: bold;
            font-size: 18px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255,255,255,0.2);
            background: #1890ff;
        }
        
        .ilabel-test-content {
            padding: 20px;
            max-height: 500px;
            overflow-y: auto;
        }
        
        .ilabel-test-info-row {
            display: flex;
            margin-bottom: 10px;
            line-height: 1.5;
            min-height: 24px;
        }
        
        .ilabel-test-info-label {
            width: 120px;
            color: #666;
            font-weight: 500;
            flex-shrink: 0;
        }
        
        .ilabel-test-info-value {
            flex: 1;
            color: #333;
            word-break: break-all;
            line-height: 24px;
        }
        
        .ilabel-test-result-box {
            margin-top: 20px;
            padding: 15px;
            border-radius: 6px;
            font-weight: bold;
            text-align: center;
            font-size: 16px;
            border-left: 5px solid #1890ff;
            background: #e6f7ff;
            color: #1890ff;
        }
        
        .ilabel-test-footer {
            padding: 15px 20px;
            border-top: 1px solid #f0f0f0;
            display: flex;
            justify-content: center;
            background: #fafafa;
        }
        
        .ilabel-test-btn {
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 30px;
            font-size: 15px;
            cursor: pointer;
            transition: background 0.2s;
            font-weight: bold;
            margin: 0 5px;
        }
        
        .ilabel-test-btn:hover { background: #40a9ff; }
        
        .ilabel-test-btn-red {
            background: #f5222d;
        }
        
        .ilabel-test-btn-red:hover {
            background: #ff4d4f;
        }
        
        .ilabel-test-btn-green {
            background: #52c41a;
        }
        
        .ilabel-test-btn-green:hover {
            background: #73d13d;
        }
        
        .ilabel-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 999999;
        }
        
        .ilabel-test-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .ilabel-test-close:hover { background: rgba(255,255,255,0.2); }
        
        .ilabel-test-controls {
            margin-top: 20px;
            padding: 15px;
            background: #fafafa;
            border-radius: 6px;
            border: 1px solid #f0f0f0;
        }
        
        .ilabel-test-radio-group {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            align-items: center;
        }
        
        .ilabel-test-radio-label {
            display: flex;
            align-items: center;
            cursor: pointer;
        }
        
        .ilabel-test-radio {
            margin-right: 5px;
        }
        
        .ilabel-test-timer {
            text-align: center;
            color: #faad14;
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
        }
    `;
    
    // ==================== 推送函数 ====================
    
    function sendWeChatPush(message, mentionedList = []) {
        console.log('测试脚本: 准备发送企业微信推送:', { message, mentionedList });
        
        let finalMessage = message;
        if (mentionedList && mentionedList.length > 0) {
            finalMessage = message + mentionedList.map(name => ` @${name}`).join('');
        }
        
        const payload = {
            msgtype: "text",
            text: {
                content: finalMessage
            }
        };
        
        // 使用GM_xmlhttpRequest发送请求
        GM_xmlhttpRequest({
            method: "POST",
            url: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb",
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status === 200) {
                    console.log('测试脚本: 企业微信推送成功');
                    
                    // 显示成功消息
                    const notification = document.querySelector('.ilabel-test-notification');
                    if (notification) {
                        const resultBox = notification.querySelector('.ilabel-test-result-box');
                        if (resultBox) {
                            resultBox.innerHTML = `
                                <div style="color: #52c41a; font-weight: bold;">
                                    ✅ 推送发送成功！
                                </div>
                                <div style="font-size: 12px; margin-top: 5px; color: #666;">
                                    消息: ${message}
                                </div>
                            `;
                        }
                    }
                } else {
                    console.error('测试脚本: 企业微信推送失败，状态码:', response.status, '响应:', response.responseText);
                    
                    // 显示失败消息
                    const notification = document.querySelector('.ilabel-test-notification');
                    if (notification) {
                        const resultBox = notification.querySelector('.ilabel-test-result-box');
                        if (resultBox) {
                            resultBox.innerHTML = `
                                <div style="color: #f5222d; font-weight: bold;">
                                    ❌ 推送发送失败！
                                </div>
                                <div style="font-size: 12px; margin-top: 5px; color: #666;">
                                    状态码: ${response.status}
                                </div>
                            `;
                        }
                    }
                }
            },
            onerror: function(error) {
                console.error('测试脚本: 企业微信推送网络错误:', error);
                
                // 显示错误消息
                const notification = document.querySelector('.ilabel-test-notification');
                if (notification) {
                    const resultBox = notification.querySelector('.ilabel-test-result-box');
                    if (resultBox) {
                        resultBox.innerHTML = `
                            <div style="color: #f5222d; font-weight: bold;">
                                ❌ 推送网络错误！
                            </div>
                            <div style="font-size: 12px; margin-top: 5px; color: #666;">
                                ${error}
                            </div>
                        `;
                    }
                }
            }
        });
    }
    
    // ==================== 弹窗显示 ====================
    
    let testPopupTimer = null;
    let timeLeft = 20;
    let testNotification = null;
    
    function showTestPopup() {
        // 移除现有弹窗
        removeTestPopup();
        
        // 创建遮罩
        const overlay = document.createElement('div');
        overlay.className = 'ilabel-overlay';
        overlay.onclick = removeTestPopup;
        
        // 创建弹窗容器
        testNotification = document.createElement('div');
        testNotification.className = 'ilabel-test-notification';
        testNotification.onclick = (e) => e.stopPropagation();
        
        // 获取当前URL作为测试URL
        const currentUrl = window.location.href;
        const currentHost = window.location.hostname;
        
        // 模拟直播信息
        const testLiveInfo = {
            liveId: 'TEST_LIVE_123456',
            description: '测试直播间描述 - 珠宝首饰展示',
            nickname: '测试主播',
            authStatus: '个人认证',
            streamStartTime: Math.floor(Date.now() / 1000)
        };
        
        // 模拟审核人员（固定为王鹏程）
        const reviewer = '王鹏程';
        
        // 选择检查结果类型
        let checkType = 'normal';
        
        // 构建弹窗HTML
        testNotification.innerHTML = `
            <div class="ilabel-test-header">
                <span>iLabel推送功能测试</span>
                <button class="ilabel-test-close">&times;</button>
            </div>

            <div class="ilabel-test-content">
                <div class="ilabel-test-info-row">
                    <span class="ilabel-test-info-label">当前页面:</span>
                    <span class="ilabel-test-info-value">${currentHost}</span>
                </div>
                
                <div class="ilabel-test-info-row">
                    <span class="ilabel-test-info-label">直播ID:</span>
                    <span class="ilabel-test-info-value">${testLiveInfo.liveId}</span>
                </div>
                
                <div class="ilabel-test-info-row">
                    <span class="ilabel-test-info-label">直播间描述:</span>
                    <span class="ilabel-test-info-value">${testLiveInfo.description}</span>
                </div>
                
                <div class="ilabel-test-info-row">
                    <span class="ilabel-test-info-label">主播昵称:</span>
                    <span class="ilabel-test-info-value">${testLiveInfo.nickname}</span>
                </div>
                
                <div class="ilabel-test-info-row">
                    <span class="ilabel-test-info-label">主播认证:</span>
                    <span class="ilabel-test-info-value">${testLiveInfo.authStatus}</span>
                </div>
                
                <div class="ilabel-test-info-row">
                    <span class="ilabel-test-info-label">审核人员:</span>
                    <span class="ilabel-test-info-value">${reviewer}</span>
                </div>

                <div class="ilabel-test-controls">
                    <div class="ilabel-test-radio-group">
                        <strong>选择测试类型:</strong>
                        <label class="ilabel-test-radio-label">
                            <input class="ilabel-test-radio" type="radio" name="testType" value="normal" checked>
                            普通单
                        </label>
                        <label class="ilabel-test-radio-label">
                            <input class="ilabel-test-radio" type="radio" name="testType" value="punishment">
                            处罚关键词单
                        </label>
                        <label class="ilabel-test-radio-label">
                            <input class="ilabel-test-radio" type="radio" name="testType" value="whitelist">
                            白名单单
                        </label>
                    </div>
                    
                    <div class="ilabel-test-result-box" id="testResultBox">
                        <div style="color: #faad14;">
                            ⚠️ 20秒内未确认将发送测试提醒给 ${reviewer}
                        </div>
                        <div class="ilabel-test-timer" id="testTimer">
                            剩余时间: 20秒
                        </div>
                    </div>
                </div>
            </div>

            <div class="ilabel-test-footer">
                <button class="ilabel-test-btn ilabel-test-btn-red" id="testCancelBtn">取消测试</button>
                <button class="ilabel-test-btn" id="testSendBtn">立即发送推送</button>
                <button class="ilabel-test-btn ilabel-test-btn-green" id="testConfirmBtn">确认并关闭</button>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(testNotification);
        
        // 设置事件监听
        const closeBtn = testNotification.querySelector('.ilabel-test-close');
        const cancelBtn = testNotification.querySelector('#testCancelBtn');
        const sendBtn = testNotification.querySelector('#testSendBtn');
        const confirmBtn = testNotification.querySelector('#testConfirmBtn');
        const radioInputs = testNotification.querySelectorAll('.ilabel-test-radio');
        const timerDisplay = testNotification.querySelector('#testTimer');
        
        // 关闭按钮
        closeBtn.onclick = removeTestPopup;
        
        // 取消按钮
        cancelBtn.onclick = removeTestPopup;
        
        // 确认按钮
        confirmBtn.onclick = () => {
            clearInterval(testPopupTimer);
            removeTestPopup();
        };
        
        // 立即发送按钮
        sendBtn.onclick = () => {
            // 获取选择的测试类型
            const selectedRadio = testNotification.querySelector('input[name="testType"]:checked');
            const testType = selectedRadio ? selectedRadio.value : 'normal';
            
            let message = '';
            switch(testType) {
                case 'normal':
                    message = '测试：该直播为普通单';
                    break;
                case 'punishment':
                    message = '测试：直播间描述命中处罚关键词：金包';
                    break;
                case 'whitelist':
                    message = '测试：该主播为白名单或事业单位';
                    break;
                default:
                    message = '测试推送消息';
            }
            
            const pushMessage = `测试推送 - ${message} @${reviewer}`;
            sendWeChatPush(pushMessage, [reviewer]);
        };
        
        // 单选按钮事件
        radioInputs.forEach(radio => {
            radio.addEventListener('change', function() {
                checkType = this.value;
                updateResultMessage();
            });
        });
        
        // 更新结果显示
        function updateResultMessage() {
            const resultBox = testNotification.querySelector('#testResultBox');
            if (!resultBox) return;
            
            let message = '';
            switch(checkType) {
                case 'normal':
                    message = '该直播为普通单';
                    break;
                case 'punishment':
                    message = '直播间描述命中处罚关键词：金包';
                    break;
                case 'whitelist':
                    message = '该主播为白名单或事业单位';
                    break;
            }
            
            const timerDisplay = testNotification.querySelector('#testTimer');
            if (timerDisplay) {
                resultBox.innerHTML = `
                    <div style="color: #faad14;">
                        ⚠️ 20秒内未确认将发送测试提醒: ${message}
                    </div>
                    <div class="ilabel-test-timer" id="testTimer">
                        剩余时间: ${timeLeft}秒
                    </div>
                `;
            }
        }
        
        // 更新计时器
        function updateTimer() {
            if (timerDisplay) {
                timerDisplay.textContent = `剩余时间: ${timeLeft}秒`;
            }
        }
        
        // ESC键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') removeTestPopup();
        };
        document.addEventListener('keydown', escHandler);
        testNotification._escHandler = escHandler;
        
        // 设置自动推送定时器（20秒）
        timeLeft = 20;
        updateTimer();
        
        testPopupTimer = setInterval(() => {
            timeLeft--;
            updateTimer();
            
            if (timeLeft <= 0) {
                clearInterval(testPopupTimer);
                
                // 获取选择的测试类型
                const selectedRadio = testNotification.querySelector('input[name="testType"]:checked');
                const testType = selectedRadio ? selectedRadio.value : 'normal';
                
                let message = '';
                switch(testType) {
                    case 'normal':
                        message = '测试超时：该直播为普通单';
                        break;
                    case 'punishment':
                        message = '测试超时：直播间描述命中处罚关键词：金包';
                        break;
                    case 'whitelist':
                        message = '测试超时：该主播为白名单或事业单位';
                        break;
                }
                
                const pushMessage = `测试超时推送 - ${message} @${reviewer}`;
                sendWeChatPush(pushMessage, [reviewer]);
                
                // 更新结果显示
                if (resultBox) {
                    resultBox.innerHTML = `
                        <div style="color: #f5222d; font-weight: bold;">
                            ⚠️ 已发送测试提醒给 ${reviewer}
                        </div>
                        <div style="font-size: 12px; margin-top: 5px; color: #666;">
                            ${message}
                        </div>
                    `;
                }
            }
        }, 1000);
        
        console.log('测试弹窗已显示');
    }
    
    // 移除弹窗
    function removeTestPopup() {
        if (testPopupTimer) {
            clearInterval(testPopupTimer);
            testPopupTimer = null;
        }
        
        const notification = document.querySelector('.ilabel-test-notification');
        const overlay = document.querySelector('.ilabel-overlay');
        
        if (notification) {
            if (notification._escHandler) {
                document.removeEventListener('keydown', notification._escHandler);
            }
            notification.remove();
        }
        
        if (overlay) overlay.remove();
    }
    
    // ==================== 初始化 ====================
    
    function init() {
        console.log('iLabel推送测试脚本初始化...');
        
        // 添加样式
        GM_addStyle(STYLES);
        
        // 等待页面加载完成后显示测试弹窗
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(showTestPopup, 1000);
            });
        } else {
            setTimeout(showTestPopup, 1000);
        }
        
        console.log('iLabel推送测试脚本初始化完成');
    }
    
    // 立即开始初始化
    init();
})();
