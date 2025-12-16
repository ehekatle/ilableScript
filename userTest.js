// ==UserScript==
// @name         iLabel远程库测试脚本
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  完全模拟用户脚本调用远程库进行测试（修复版）
// @author       caloneis
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('iLabel远程库测试脚本开始执行');
    
    // ==================== 远程库URL ====================
    const REMOTE_SCRIPT_URL = 'https://gh-proxy.org/https://github.com/ehekatle/ilableScript/blob/test/ilableScript.js';
    
    // ==================== 样式定义 ====================
    const STYLES = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slideOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(20px); }
        }
        
        .ilabel-test-panel {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000000;
            font-family: 'Microsoft YaHei', sans-serif;
            max-width: 500px;
            border-left: 4px solid #1890ff;
            animation: fadeIn 0.5s ease;
        }
        
        .ilabel-success-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #52c41a;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000001;
            font-family: 'Microsoft YaHei', sans-serif;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        }
    `;
    
    // ==================== 模拟环境变量 ====================
    
    // 模拟localStorage（用于存储开关状态）
    if (!window.localStorage || typeof window.localStorage.setItem !== 'function') {
        window.localStorage = {
            _data: {},
            setItem: function(key, value) {
                this._data[key] = value;
                console.log(`模拟localStorage.setItem: ${key}=${value}`);
            },
            getItem: function(key) {
                const value = this._data[key];
                console.log(`模拟localStorage.getItem: ${key}=${value}`);
                return value;
            },
            removeItem: function(key) {
                delete this._data[key];
                console.log(`模拟localStorage.removeItem: ${key}`);
            }
        };
    }
    
    // 设置初始开关状态为开启
    localStorage.setItem('ilabel_reminder_enabled', 'true');
    
    // ==================== 推送函数（模拟用户脚本的推送） ====================
    
    function sendWeChatPush(message, mentionedList = []) {
        console.log('测试脚本推送函数被调用:', { message, mentionedList });
        
        let finalMessage = message;
        if (mentionedList && mentionedList.length > 0) {
            finalMessage = message + mentionedList.map(name => ` @${name}`).join('');
        }
        
        console.log('-----------------------------------------');
        console.log('✅ 测试推送成功！');
        console.log('推送消息:', finalMessage);
        console.log('推送URL: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb');
        console.log('-----------------------------------------');
        
        // 显示推送成功提示
        showPushSuccess(finalMessage);
        
        return true;
    }
    
    // ==================== UI辅助函数 ====================
    
    function showTestInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'ilabel-test-panel';
        
        instructions.innerHTML = `
            <div style="font-weight: bold; color: #1890ff; margin-bottom: 10px;">
                🧪 iLabel远程库测试
            </div>
            <div style="font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 10px;">
                1. 已成功加载远程库<br>
                2. 审核人员设置为: <strong>王鹏程</strong><br>
                3. 开关状态: <strong>已开启</strong><br>
                4. 弹窗将在20秒后自动推送<br>
                5. 您也可以点击弹窗中的"确认并关闭"按钮
            </div>
            <div style="font-size: 12px; color: #999;">
                测试完成后，请刷新页面停止测试
            </div>
        `;
        
        document.body.appendChild(instructions);
        return instructions;
    }
    
    function showPushSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'ilabel-success-panel';
        
        successDiv.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">✅ 测试推送成功</div>
            <div style="font-size: 12px; opacity: 0.9;">${message}</div>
        `;
        
        document.body.appendChild(successDiv);
        
        // 3秒后移除
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (successDiv.parentNode) {
                        successDiv.parentNode.removeChild(successDiv);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // ==================== 直接触发弹窗（修复关键） ====================
    
    function triggerPopupDirectly() {
        console.log('直接触发弹窗...');
        
        // 模拟远程库中的showPopup函数
        // 创建模拟的liveInfo对象
        const mockLiveInfo = {
            liveId: 'TEST_LIVE_' + Date.now(),
            description: '测试直播间描述 - 珠宝首饰展示',
            nickname: '测试主播',
            signature: '测试签名',
            authStatus: '个人认证',
            createLiveArea: '北京',
            poiName: '北京市',
            streamStartTime: Math.floor(Date.now() / 1000)
        };
        
        // 审核人员固定为王鹏程
        const reviewer = '王鹏程';
        
        // 模拟检查结果
        const checkResult = {
            type: 'normal',
            message: '该直播为普通单',
            color: 'normal',
            headerClass: 'ilabel-header-normal',
            resultClass: 'ilabel-result-normal'
        };
        
        // 调用远程库的showPopup函数（如果已定义）
        if (typeof window.showPopup === 'function') {
            window.showPopup(mockLiveInfo, reviewer, checkResult);
            console.log('通过window.showPopup触发弹窗');
            return true;
        }
        
        // 如果远程库的showPopup不可用，手动创建弹窗
        console.log('远程库showPopup未找到，尝试手动创建弹窗...');
        return createManualPopup(mockLiveInfo, reviewer, checkResult);
    }
    
    function createManualPopup(liveInfo, reviewer, checkResult) {
        try {
            console.log('手动创建弹窗...');
            
            // 先确保远程库的样式已加载
            if (!document.querySelector('#ilabel-styles')) {
                console.warn('远程库样式未加载，可能无法正常显示弹窗');
            }
            
            // 模拟远程库的showPopup逻辑
            const overlay = document.createElement('div');
            overlay.className = 'ilabel-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
                z-index: 999999;
            `;
            
            const notification = document.createElement('div');
            notification.className = 'ilabel-custom-notification';
            notification.style.cssText = `
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
            `;
            
            // 添加关键帧动画
            const style = document.createElement('style');
            style.textContent = `
                @keyframes popupFadeIn {
                    from { opacity: 0; transform: translate(-50%, -60%); }
                    to { opacity: 1; transform: translate(-50%, -50%); }
                }
            `;
            document.head.appendChild(style);
            
            notification.innerHTML = `
                <div class="ilabel-notification-header" style="padding: 16px 20px; font-weight: bold; font-size: 18px; color: white; background: #1890ff; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.2);">
                    <span>直播审核信息</span>
                    <button style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s;">&times;</button>
                </div>

                <div style="padding: 20px; max-height: 500px; overflow-y: auto;">
                    <div style="display: flex; margin-bottom: 10px; line-height: 1.5; min-height: 24px;">
                        <span style="width: 100px; color: #666; font-weight: 500; flex-shrink: 0;">直播ID:</span>
                        <span style="flex: 1; color: #333; word-break: break-all; line-height: 24px;">${liveInfo.liveId}</span>
                    </div>
                    
                    <div style="display: flex; margin-bottom: 10px; line-height: 1.5; min-height: 24px;">
                        <span style="width: 100px; color: #666; font-weight: 500; flex-shrink: 0;">直播间描述:</span>
                        <span style="flex: 1; color: #333; word-break: break-all; line-height: 24px;">${liveInfo.description}</span>
                    </div>
                    
                    <div style="display: flex; margin-bottom: 10px; line-height: 1.5; min-height: 24px;">
                        <span style="width: 100px; color: #666; font-weight: 500; flex-shrink: 0;">主播昵称:</span>
                        <span style="flex: 1; color: #333; word-break: break-all; line-height: 24px;">${liveInfo.nickname}</span>
                    </div>
                    
                    <div style="display: flex; margin-bottom: 10px; line-height: 1.5; min-height: 24px;">
                        <span style="width: 100px; color: #666; font-weight: 500; flex-shrink: 0;">主播认证:</span>
                        <span style="flex: 1; color: #333; word-break: break-all; line-height: 24px;">${liveInfo.authStatus}</span>
                    </div>
                    
                    <div style="display: flex; margin-bottom: 10px; line-height: 1.5; min-height: 24px;">
                        <span style="width: 100px; color: #666; font-weight: 500; flex-shrink: 0;">审核人员:</span>
                        <span style="flex: 1; color: #333; word-break: break-all; line-height: 24px;">${reviewer}</span>
                    </div>

                    <div style="margin-top: 20px; padding: 15px; border-radius: 6px; font-weight: bold; text-align: center; font-size: 16px; border-left: 5px solid #91d5ff; background: #e6f7ff; color: #1890ff;">
                        ${checkResult.message}
                        <div style="color: #faad14; font-size: 13px; margin-top: 5px; text-align: center;">
                            ⚠️ 20秒内未确认将发送提醒给 ${reviewer}
                        </div>
                    </div>
                </div>

                <div style="padding: 15px 20px; border-top: 1px solid #f0f0f0; display: flex; justify-content: center; background: #fafafa;">
                    <button style="background: #1890ff; color: white; border: none; border-radius: 6px; padding: 10px 30px; font-size: 15px; cursor: pointer; transition: background 0.2s; font-weight: bold;">确认并关闭</button>
                </div>
            `;
            
            overlay.onclick = function() {
                document.body.removeChild(overlay);
                document.body.removeChild(notification);
            };
            
            notification.onclick = function(e) {
                e.stopPropagation();
            };
            
            const closeBtn = notification.querySelector('button');
            closeBtn.onclick = function() {
                document.body.removeChild(overlay);
                document.body.removeChild(notification);
            };
            
            const confirmBtn = notification.querySelector('div:last-child button');
            confirmBtn.onclick = function() {
                document.body.removeChild(overlay);
                document.body.removeChild(notification);
            };
            
            // 添加到页面
            document.body.appendChild(overlay);
            document.body.appendChild(notification);
            
            console.log('手动弹窗创建成功');
            return true;
            
        } catch (error) {
            console.error('创建手动弹窗失败:', error);
            return false;
        }
    }
    
    // ==================== 加载远程库 ====================
    
    function loadRemoteScript() {
        console.log('测试脚本: 开始加载远程库...');
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: REMOTE_SCRIPT_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        // 注入样式
                        GM_addStyle(STYLES);
                        
                        // 在注入远程库之前，设置推送函数
                        window._ilabelSendPush = sendWeChatPush;
                        
                        // 注入远程库代码
                        const script = document.createElement('script');
                        script.textContent = response.responseText;
                        script.type = 'text/javascript';
                        document.head.appendChild(script);
                        script.remove();
                        
                        console.log('测试脚本: 远程库加载成功');
                        
                        // 显示测试说明
                        showTestInstructions();
                        
                        // 等待远程库初始化完成后，直接触发弹窗
                        setTimeout(() => {
                            console.log('尝试触发弹窗...');
                            const success = triggerPopupDirectly();
                            
                            if (!success) {
                                console.log('弹窗触发失败，延迟重试...');
                                setTimeout(triggerPopupDirectly, 1000);
                            }
                        }, 1500);
                        
                    } catch (e) {
                        console.error('测试脚本: 远程库处理失败:', e);
                        loadBackupScript();
                    }
                } else {
                    console.error('测试脚本: 远程库加载失败，状态码:', response.status);
                    loadBackupScript();
                }
            },
            onerror: function(error) {
                console.error('测试脚本: 远程库加载网络错误:', error);
                loadBackupScript();
            }
        });
    }
    
    // ==================== 备用脚本 ====================
    
    function loadBackupScript() {
        console.log('测试脚本: 使用备用脚本...');
        
        // 显示错误提示
        const errorPanel = document.createElement('div');
        errorPanel.className = 'ilabel-test-panel';
        errorPanel.style.borderLeftColor = '#f5222d';
        
        errorPanel.innerHTML = `
            <div style="font-weight: bold; color: #f5222d; margin-bottom: 10px;">
                ❌ 远程库加载失败
            </div>
            <div style="font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 10px;">
                请检查网络连接或远程库URL
            </div>
        `;
        
        document.body.appendChild(errorPanel);
    }
    
    // ==================== 初始化 ====================
    
    function init() {
        console.log('测试脚本: 初始化...');
        
        // 加载远程库
        loadRemoteScript();
        
        console.log('测试脚本: 初始化完成');
    }
    
    // ==================== 立即开始初始化 ====================
    
    // 等待页面基本就绪
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
})();
