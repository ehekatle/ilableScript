// ==UserScript==
// @name         iLabel直播审核辅助
// @namespace    https://github.com/ehekatle/ilableScript
// @version      2.1.1
// @description  预埋、豁免、直播信息违规、超时提示功能，最终版
// @author       ehekatle
// @homepage     https://github.com/ehekatle/ilableScript
// @source       https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilabelScript.user.js
// @supportURL   https://github.com/ehekatle/ilableScript/issues
// @updateURL    https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilabelScript.meta.js
// @downloadURL  https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/main/ilabelScript.user.js
// @match        https://ilabel.weixin.qq.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=weixin.qq.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 开关状态存储键名
    const SWITCH_KEY = 'ilabel_reminder_enabled';
    // 远程库URL
    const REMOTE_SCRIPT_URL = 'https://gh-proxy.org/https://raw.githubusercontent.com/ehekatle/ilableScript/test/ilableScript.js';

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

        .ilabel-switch-container:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.25);
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

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;

    // ========== 兼容性函数 ==========

    // 兼容的样式添加函数
    function addStyle(css) {
        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(css);
        } else {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    // 兼容的存储函数
    function getValue(key, defaultValue) {
        if (typeof GM_getValue !== 'undefined') {
            return GM_getValue(key, defaultValue);
        } else {
            try {
                const value = localStorage.getItem(key);
                return value !== null ? JSON.parse(value) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        }
    }

    function setValue(key, value) {
        if (typeof GM_setValue !== 'undefined') {
            GM_setValue(key, value);
        } else {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('保存设置失败:', e);
            }
        }
    }

    // ========== 功能函数 ==========

    // 加载远程脚本
    function injectRemoteScript() {
        console.log('开始加载远程脚本...');

        GM_xmlhttpRequest({
            method: 'GET',
            url: REMOTE_SCRIPT_URL + '?t=' + Date.now(),
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const script = document.createElement('script');
                        script.textContent = response.responseText;
                        script.type = 'text/javascript';
                        document.head.appendChild(script);
                        console.log('远程脚本注入成功');
                        window.REMOTE_SCRIPT_LOADED = true;
                    } catch (e) {
                        console.error('远程脚本执行失败:', e);
                        window.REMOTE_SCRIPT_LOAD_ERROR = e.message;
                    }
                } else {
                    console.error('远程脚本加载失败，状态码:', response.status);
                    window.REMOTE_SCRIPT_LOAD_ERROR = 'HTTP状态码: ' + response.status;
                }
            },
            onerror: function(error) {
                console.error('远程脚本加载网络错误:', error);
                window.REMOTE_SCRIPT_LOAD_ERROR = '网络错误';
            }
        });
    }

    // 创建开关按钮
    function createSwitchButton() {
        const container = document.createElement('div');
        container.className = 'ilabel-switch-container';
        container.id = 'ilabel-switch-container';

        const switchContainer = document.createElement('label');
        switchContainer.className = 'ilabel-switch';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'ilabel-reminder-switch';
        checkbox.checked = getValue(SWITCH_KEY, true);

        const slider = document.createElement('span');
        slider.className = 'ilabel-switch-slider';

        // 保存状态变化
        checkbox.addEventListener('change', function() {
            setValue(SWITCH_KEY, this.checked);
            container.title = this.checked ? '提醒已开启' : '提醒已关闭';
            console.log('提醒开关状态:', this.checked ? '开启' : '关闭');
        });

        container.title = checkbox.checked ? '提醒已开启' : '提醒已关闭';

        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        container.appendChild(switchContainer);

        // 添加状态指示点
        const statusDot = document.createElement('div');
        statusDot.className = 'ilabel-status-dot loading';
        container.appendChild(statusDot);

        // 检查远程库加载状态
        const checkRemoteStatus = setInterval(() => {
            if (window.REMOTE_SCRIPT_LOADED) {
                statusDot.className = 'ilabel-status-dot success';
                clearInterval(checkRemoteStatus);
                setTimeout(() => statusDot.remove(), 2000);
                console.log('远程脚本加载成功');
            } else if (window.REMOTE_SCRIPT_LOAD_ERROR) {
                statusDot.className = 'ilabel-status-dot error';
                clearInterval(checkRemoteStatus);
                container.title += ' (远程脚本加载失败)';
                console.error('远程脚本加载失败:', window.REMOTE_SCRIPT_LOAD_ERROR);
            }
        }, 500);

        // 10秒后超时
        setTimeout(() => {
            if (!window.REMOTE_SCRIPT_LOADED && !window.REMOTE_SCRIPT_LOAD_ERROR) {
                window.REMOTE_SCRIPT_LOAD_ERROR = '加载超时';
            }
        }, 10000);

        return container;
    }

    // 初始化
    function init() {
        console.log('iLabel辅助工具初始化...');

        // 添加样式
        addStyle(STYLES);

        // 立即开始加载远程脚本
        injectRemoteScript();

        // 等待DOM加载后添加开关按钮
        const addSwitch = () => {
            // 检查是否已经存在开关
            if (document.getElementById('ilabel-switch-container')) {
                console.log('开关按钮已存在');
                return;
            }

            const switchBtn = createSwitchButton();
            document.body.appendChild(switchBtn);
            console.log('开关按钮已添加');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addSwitch);
        } else {
            addSwitch();
        }

        // 向页面暴露开关状态获取方法
        window.getReminderStatus = () => getValue(SWITCH_KEY, true);

        console.log('iLabel辅助工具初始化完成');
    }

    // 立即开始初始化
    init();
})();
