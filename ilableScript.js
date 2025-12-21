/* VERSION: 2.4.3 */
/* CONFIG START */
// 主播白名单（空格分隔）
const anchorWhiteList = "百年对语 东南军迷俱乐部 广东新闻广描 广东新闻频道 广东移动频道 湖南国际瑰宝雅集 湖南国际频道文创甄选 湖南国际珍宝收藏 琳琅瑰宝雅集 央博匠心 雨家饰品 雨家首饰 豫见新财富 BRTV大家收藏 BRTV首都经济报道 好物珍宝 央博典藏 央博非遗珍宝 央博好物 央博木作 央博器".split(' ');

// 处罚检查关键词（空格分隔）
const penaltyKeywords = "金包 金重量 金含量 金镯子 金项链 金子这么便宜 缅 曼德勒 越南 老仓库".split(' ');

// 审核白名单 - 姓名+手机号格式
const auditorWhiteList = [
    { name: "王鹏程", mobile: "18423065975" },
    { name: "刘丹娜", mobile: "18323846400" },
    { name: "蒋娜娜", mobile: "13658465344" },
    { name: "刘维青", mobile: "15310703511" },
    { name: "李晓露", mobile: "15922633098" },
    { name: "何浩", mobile: "17878177114" },
    { name: "卢洪", mobile: "18883245082" }
];

// 审核黑名单
const auditorBlackList = [""];

// 推送地址
const pushUrl = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=23f0bbf8-3665-4f4d-b66a-16ac364b6b8f";

// 手机号映射（从白名单自动生成）
const auditorMobileMap = (function() {
    const map = {};
    auditorWhiteList.forEach(auditor => {
        map[auditor.name] = auditor.mobile;
    });
    return map;
})();
/* CONFIG END */

// 主处理函数
function checkInfo(getInfoData, config, callback) {
    // 1. 审核人员检查
    const auditorName = getInfoData.auditor || '';
    
    // 检查是否在黑名单中
    const isBlacklisted = config.auditorBlackList.some(item => {
        if (typeof item === 'string') return item === auditorName;
        if (item && item.name) return item.name === auditorName;
        return false;
    });
    
    if (auditorName && isBlacklisted) {
        callback({
            type: 'blacklist',
            message: '审核人员在黑名单中'
        });
        return;
    }

    // 2. 预埋单检查
    if (isPrefilledOrder(getInfoData)) {
        callback({
            type: 'prefilled',
            message: '该直播为预埋单'
        });
        return;
    }

    // 3. 豁免检查 - 新增主播认证检查
    if (isExempted(getInfoData, config)) {
        callback({
            type: 'exempted',
            message: '该主播为白名单或事业媒体'
        });
        return;
    }

    // 4. 处罚检查
    const penaltyResult = checkPenalty(getInfoData, config);
    if (penaltyResult.found) {
        callback({
            type: 'penalty',
            message: `${penaltyResult.location}命中处罚关键词：${penaltyResult.keyword}`
        });
        return;
    }

    // 5. 其他情况
    callback({
        type: 'normal',
        message: '该直播为普通单'
    });
}

// 检查是否为预埋单
function isPrefilledOrder(data) {
    if (!data.streamStartTime || !data.audit_time) return false;
    
    const streamDate = new Date(parseInt(data.streamStartTime) * 1000);
    const auditDate = new Date(parseInt(data.audit_time) * 1000);
    const now = new Date();
    
    // 检查是否在同一天
    const isSameDay = streamDate.getDate() === now.getDate() && 
                     streamDate.getMonth() === now.getMonth() && 
                     streamDate.getFullYear() === now.getFullYear();
    
    // 检查送审时间是否早于网络时间1小时
    const oneHourEarly = new Date(now.getTime() - 60 * 60 * 1000);
    const isAuditEarly = auditDate < oneHourEarly;
    
    return !isSameDay || isAuditEarly;
}

// 检查是否豁免 - 修改：增加主播认证检查
function isExempted(data, config) {
    // 检查主播昵称是否在白名单中
    if (data.nickname && config.anchorWhiteList) {
        for (let i = 0; i < config.anchorWhiteList.length; i++) {
            if (config.anchorWhiteList[i] && data.nickname.includes(config.anchorWhiteList[i])) {
                return true;
            }
        }
    }
    
    // 检查主播认证是否包含"事业媒体"
    if (data.authStatus && data.authStatus.includes('事业媒体')) {
        return true;
    }
    
    return false;
}

// 检查处罚关键词
function checkPenalty(data, config) {
    if (!config.penaltyKeywords) {
        return { found: false };
    }
    
    // 检查顺序：直播间描述 -> 主播昵称 -> 开播位置
    const checkOrder = [
        { field: 'description', label: '直播间描述' },
        { field: 'nickname', label: '主播昵称' },
        { field: 'poiName', label: '开播位置' }
    ];
    
    for (const check of checkOrder) {
        const fieldValue = data[check.field] || '';
        for (const keyword of config.penaltyKeywords) {
            if (fieldValue.includes(keyword)) {
                return {
                    found: true,
                    location: check.label,
                    keyword: keyword
                };
            }
        }
    }
    
    return { found: false };
}



