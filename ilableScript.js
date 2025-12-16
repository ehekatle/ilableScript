// ==================== 配置部分 ====================
// 主播白名单（空格分隔）
const CONFIG = {
  ANCHOR_WHITELIST: "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博器",
  
  // 处罚检查关键词（空格分隔）
  PUNISHMENT_KEYWORDS: "金包 金重量 金含量 金镯子 金项链 金子这么便宜 缅 曼德勒 越南",
  
  // 审核白名单（空格分隔）
  REVIEWER_WHITELIST: "王鹏程 刘丹娜 蒋娜娜 刘维青 李晓露 何浩 卢洪",
  
  // 审核黑名单（空格分隔）
  REVIEWER_BLACKLIST: "杨松江",
  
  // 推送地址
  PUSH_URL: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=90014c35-804f-489e-b203-bf59f46f69fb"
};

// 将配置转换为数组
const ANCHOR_WHITELIST_ARRAY = CONFIG.ANCHOR_WHITELIST.split(' ').filter(item => item.trim());
const PUNISHMENT_KEYWORDS_ARRAY = CONFIG.PUNISHMENT_KEYWORDS.split(' ').filter(item => item.trim());
const REVIEWER_WHITELIST_ARRAY = CONFIG.REVIEWER_WHITELIST.split(' ').filter(item => item.trim());
const REVIEWER_BLACKLIST_ARRAY = CONFIG.REVIEWER_BLACKLIST.split(' ').filter(item => item.trim());

// ==================== 全局变量 ====================
let currentLiveInfo = null;
let currentReviewer = null;
let popupTimer = null;
let popupStartTime = null;
let isInitialized = false;
let xhrInterceptorBound = false;

// ==================== 样式定义 ====================
const STYLES = `
    .ilabel-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000000;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        min-width: 400px;
        max-width: 600px;
        font-family: 'Microsoft YaHei', sans-serif;
        overflow: hidden;
        animation: popupFadeIn 0.3s ease;
    }
    
    @keyframes popupFadeIn {
        from {
            opacity: 0;
            transform: translate(-50%, -60%);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
    }
    
    .ilabel-popup-header {
        padding: 16px 20px;
        font-weight: bold;
        font-size: 16px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .ilabel-popup-header.normal {
        background: #1890ff;
    }
    
    .ilabel-popup-header.green {
        background: #52c41a;
    }
    
    .ilabel-popup-header.yellow {
        background: #faad14;
    }
    
    .ilabel-popup-header.red {
        background: #f5222d;
    }
    
    .ilabel-popup-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
    }
    
    .ilabel-popup-close:hover {
        background: rgba(255,255,255,0.2);
    }
    
    .ilabel-popup-content {
        padding: 20px;
        max-height: 500px;
        overflow-y: auto;
    }
    
    .ilabel-info-row {
        display: flex;
        margin-bottom: 12px;
        line-height: 1.5;
    }
    
    .ilabel-info-label {
        width: 100px;
        color: #666;
        font-weight: 500;
        flex-shrink: 0;
    }
    
    .ilabel-info-value {
        flex: 1;
        color: #333;
        word-break: break-all;
    }
    
    .ilabel-copy-btn {
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 12px;
        font-size: 12px;
        cursor: pointer;
        margin-left: 8px;
        transition: background 0.2s;
    }
    
    .ilabel-copy-btn:hover {
        background: #40a9ff;
    }
    
    .ilabel-copy-btn:active {
        background: #096dd9;
    }
    
    .ilabel-copied {
        background: #52c41a !important;
    }
    
    .ilabel-result {
        margin-top: 16px;
        padding: 12px;
        border-radius: 6px;
        font-weight: bold;
        text-align: center;
    }
    
    .ilabel-result.normal {
        background: #e6f7ff;
        color: #1890ff;
        border: 1px solid #91d5ff;
    }
    
    .ilabel-result.green {
        background: #f6ffed;
        color: #52c41a;
        border: 1px solid #b7eb8f;
    }
    
    .ilabel-result.yellow {
        background: #fffbe6;
        color: #faad14;
        border: 1px solid #ffe58f;
    }
    
    .ilabel-result.red {
        background: #fff1f0;
        color: #f5222d;
        border: 1px solid #ffa39e;
    }
    
    .ilabel-popup-footer {
        padding: 16px 20px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        justify-content: center;
    }
    
    .ilabel-confirm-btn {
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 24px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .ilabel-confirm-btn:hover {
        background: #40a9ff;
    }
    
    .ilabel-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 999999;
    }
`;

// ==================== 工具函数 ====================

// 添加样式到页面
function addStyles() {
    if (!document.querySelector('#ilabel-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'ilabel-styles';
        styleEl.textContent = STYLES;
        document.head.appendChild(styleEl);
    }
}

// 获取网络北京时间
function getBeijingTime() {
    const now = new Date();
    const beijingOffset = 8 * 60;
    const localOffset = now.getTimezoneOffset();
    const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60 * 1000);
    return beijingTime;
}

// 格式化时间戳
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// 检查是否是同一天
function isSameDay(timestamp1, timestamp2) {
    const date1 = new Date(timestamp1 * 1000);
    const date2 = new Date(timestamp2 * 1000);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        return true;
    } catch (err) {
        console.error('复制失败:', err);
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
}

// 发送企业微信推送
async function sendWeChatPush(message, mentionedList = []) {
    try {
        const payload = {
            msgtype: "text",
            text: {
                content: message,
                mentioned_list: mentionedList
            }
        };
        
        const response = await fetch(CONFIG.PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            console.error('推送发送失败:', response.status);
        }
    } catch (error) {
        console.error('推送发送失败:', error);
    }
}

// ==================== 信息获取部分 ====================

// 获取审核人员信息
async function getReviewerInfo() {
    try {
        const response = await fetch('https://ilabel.weixin.qq.com/api/user/info', {
            method: 'GET',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'x-requested-with': 'XMLHttpRequest'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok' && data.data && data.data.name) {
                const fullName = data.data.name;
                const dashIndex = fullName.indexOf('-');
                if (dashIndex !== -1) {
                    return fullName.substring(dashIndex + 1);
                }
                return fullName;
            }
        }
    } catch (error) {
        console.error('获取审核人员信息失败:', error);
    }
    return null;
}

// 解析直播信息
function parseLiveInfo(responseData) {
    if (!responseData || responseData.ret !== 0 || !responseData.liveInfoList || responseData.liveInfoList.length === 0) {
        return null;
    }
    
    const liveInfo = responseData.liveInfoList[0];
    return {
        liveId: liveInfo.liveId || '',
        description: liveInfo.description || '',
        nickname: liveInfo.nickname || '',
        signature: liveInfo.signature || '',
        authStatus: liveInfo.authStatus || '',
        createLiveArea: liveInfo.extraField?.createLiveArea || '',
        poiName: liveInfo.poiName || '',
        streamStartTime: liveInfo.streamStartTime ? parseInt(liveInfo.streamStartTime) : null
    };
}

// ==================== 信息检查部分 ====================

function checkInfo(liveInfo, reviewer) {
    // 1. 审核人员检查
    if (reviewer && REVIEWER_BLACKLIST_ARRAY.includes(reviewer)) {
        return {
            type: 'blacklist',
            message: '审核人员在黑名单中',
            color: 'red'
        };
    }
    
    // 2. 质检单检查
    if (liveInfo.streamStartTime) {
        const beijingTime = getBeijingTime();
        const currentTimestamp = Math.floor(beijingTime.getTime() / 1000);
        
        if (!isSameDay(liveInfo.streamStartTime, currentTimestamp)) {
            return {
                type: 'quality',
                message: '该直播为质检单',
                color: 'red'
            };
        }
    }
    
    // 3. 豁免检查
    if (ANCHOR_WHITELIST_ARRAY.includes(liveInfo.nickname) || 
        (liveInfo.authStatus && liveInfo.authStatus.includes('事业单位'))) {
        return {
            type: 'whitelist',
            message: '该主播为白名单或事业单位',
            color: 'green'
        };
    }
    
    // 4. 处罚检查
    const checkFields = [
        { field: liveInfo.description, name: '直播间描述' },
        { field: liveInfo.nickname, name: '主播昵称' },
        { field: liveInfo.poiName, name: '开播位置' }
    ];
    
    for (const check of checkFields) {
        if (check.field) {
            for (const keyword of PUNISHMENT_KEYWORDS_ARRAY) {
                if (check.field.includes(keyword)) {
                    return {
                        type: 'punishment',
                        message: `${check.name}命中处罚关键词：${keyword}`,
                        color: 'yellow'
                    };
                }
            }
        }
    }
    
    // 5. 普通单
    return {
        type: 'normal',
        message: '该直播为普通单',
        color: 'normal'
    };
}

// ==================== 弹窗显示部分 ====================

function showPopup(liveInfo, reviewer, checkResult) {
    // 移除现有弹窗
    removePopup();
    
    // 检查开关状态
    const reminderEnabled = window.getReminderStatus ? window.getReminderStatus() : true;
    
    // 开关关闭时，只有普通单不显示弹窗；其他检查类型都要显示
    if (!reminderEnabled && checkResult.type === 'normal') {
        console.log('提醒开关已关闭，普通单不显示弹窗');
        return;
    }
    
    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.className = 'ilabel-overlay';
    overlay.onclick = removePopup;
    
    // 创建弹窗
    const popup = document.createElement('div');
    popup.className = 'ilabel-popup';
    popup.onclick = (e) => e.stopPropagation();
    
    // 弹窗标题
    const header = document.createElement('div');
    header.className = `ilabel-popup-header ${checkResult.color}`;
    header.innerHTML = `
        <span>直播审核信息</span>
        <button class="ilabel-popup-close">&times;</button>
    `;
    
    // 关闭按钮事件
    header.querySelector('.ilabel-popup-close').onclick = removePopup;
    
    // 内容区域
    const content = document.createElement('div');
    content.className = 'ilabel-popup-content';
    
    // 信息行
    const infoRows = [
        { label: 'LiveID', value: liveInfo.liveId, copyable: true },
        { label: '直播间描述', value: liveInfo.description },
        { label: '主播昵称', value: liveInfo.nickname },
        { label: '主播简介', value: liveInfo.signature },
        { label: '主播认证', value: liveInfo.authStatus },
        { label: '开播地', value: liveInfo.createLiveArea },
        { label: '开播位置', value: liveInfo.poiName },
        { label: '开播时间', value: formatTimestamp(liveInfo.streamStartTime) },
        { label: '审核人员', value: reviewer }
    ];
    
    infoRows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'ilabel-info-row';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'ilabel-info-label';
        labelSpan.textContent = row.label + '：';
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'ilabel-info-value';
        valueSpan.textContent = row.value || '无';
        
        rowDiv.appendChild(labelSpan);
        rowDiv.appendChild(valueSpan);
        
        // 添加复制按钮
        if (row.copyable && row.value) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'ilabel-copy-btn';
            copyBtn.textContent = '复制';
            copyBtn.onclick = () => {
                if (copyToClipboard(row.value)) {
                    copyBtn.textContent = '已复制';
                    copyBtn.classList.add('ilabel-copied');
                    setTimeout(() => {
                        copyBtn.textContent = '复制';
                        copyBtn.classList.remove('ilabel-copied');
                    }, 2000);
                }
            };
            rowDiv.appendChild(copyBtn);
        }
        
        content.appendChild(rowDiv);
    });
    
    // 检查结果
    const resultDiv = document.createElement('div');
    resultDiv.className = `ilabel-result ${checkResult.color}`;
    resultDiv.textContent = checkResult.message;
    content.appendChild(resultDiv);
    
    // 底部确认按钮
    const footer = document.createElement('div');
    footer.className = 'ilabel-popup-footer';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'ilabel-confirm-btn';
    confirmBtn.textContent = '确 认';
    confirmBtn.onclick = removePopup;
    
    footer.appendChild(confirmBtn);
    
    // 组装弹窗
    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(footer);
    
    // 添加到页面
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    
    // 记录弹窗开始时间
    popupStartTime = Date.now();
    
    // 设置推送定时器（如果审核人员在白名单中）
    if (reviewer && REVIEWER_WHITELIST_ARRAY.includes(reviewer) && reminderEnabled) {
        popupTimer = setTimeout(() => {
            // 检查弹窗是否仍然存在
            if (document.contains(popup)) {
                const mentionedList = [reviewer];
                const pushMessage = `新单未确认，${checkResult.message}`;
                sendWeChatPush(pushMessage, mentionedList);
                console.log('已发送推送提醒:', pushMessage);
            }
        }, 60000); // 1分钟后
    }
    
    // 记录日志
    console.log('弹窗已显示，类型:', checkResult.type, '开关状态:', reminderEnabled ? '开启' : '关闭');
}

// 移除弹窗
function removePopup() {
    const popup = document.querySelector('.ilabel-popup');
    const overlay = document.querySelector('.ilabel-overlay');
    
    if (popup) popup.remove();
    if (overlay) overlay.remove();
    
    if (popupTimer) {
        clearTimeout(popupTimer);
        popupTimer = null;
    }
    
    popupStartTime = null;
}

// ==================== 请求拦截部分 ====================

// 绑定XMLHttpRequest拦截器（参考您的工作脚本）
function bindXHRInterceptor() {
    if (xhrInterceptorBound) return;
    
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
                handleResponse(this);
            }
            
            if (originalOnReadyStateChange) {
                originalOnReadyStateChange.apply(this, arguments);
            }
        };
        
        this.onload = function() {
            if (this.status === 200) {
                handleResponse(this);
            }
            
            if (originalOnLoad) {
                originalOnLoad.apply(this, arguments);
            }
        };
        
        return originalXHRSend.apply(this, args);
    };
    
    xhrInterceptorBound = true;
    console.log('XMLHttpRequest拦截器已绑定');
}

// 处理响应数据
async function handleResponse(xhr) {
    if (xhr._requestURL && xhr._requestURL.includes('get_live_info_batch')) {
        try {
            const responseText = xhr.responseText;
            if (responseText) {
                const responseData = JSON.parse(responseText);
                const liveInfo = parseLiveInfo(responseData);
                
                if (liveInfo) {
                    console.log('检测到直播信息请求，开始处理...');
                    
                    // 获取审核人员信息
                    const reviewer = await getReviewerInfo();
                    
                    // 执行检查
                    const checkResult = checkInfo(liveInfo, reviewer);
                    
                    // 显示弹窗
                    setTimeout(() => {
                        showPopup(liveInfo, reviewer, checkResult);
                    }, 500);
                }
            }
        } catch (err) {
            console.error('解析响应数据失败:', err);
        }
    }
}

// ==================== 初始化 ====================

function init() {
    if (isInitialized) {
        console.log('脚本已初始化');
        return;
    }
    
    console.log('iLabel远程脚本初始化...');
    
    // 添加样式
    addStyles();
    
    // 绑定XMLHttpRequest拦截器（使用参考脚本的方法）
    bindXHRInterceptor();
    
    // 监听DOM变化以重新绑定拦截器
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'SCRIPT' || node.nodeName === 'IFRAME') {
                        bindXHRInterceptor();
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    isInitialized = true;
    console.log('iLabel远程脚本初始化完成');
}

// 初始化（使用参考脚本的初始化方式）
(function() {
    console.log('iLabel直播审核辅助工具远程库加载成功');
    
    if (document.readyState === 'complete') {
        setTimeout(() => {
            if (!isInitialized) {
                init();
            }
        }, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (!isInitialized) {
                    init();
                }
            }, 1000);
        });
    }
    
    // 防止脚本被卸载
    window.addEventListener('beforeunload', function() {
        setTimeout(() => {
            if (isInitialized) {
                bindXHRInterceptor();
            }
        }, 100);
    });
})();

// 导出配置（可选）
window.ILABEL_CONFIG = CONFIG;
