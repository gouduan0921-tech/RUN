import { Vec3 } from "cc"

const gameConstants = {
    //@en--------------wx data-------------------
    //@zh--------------微信 数据-------------------
    checkBenchmark: 22, //判断低端机的性能等级

    //@en--------------i18 data-------------------
    //@zh--------------多语言 数据-------------------
    LANGUAGE_LIST: {
        DIAMOND: '钻石',
        COMMING_SOON: '敬请期待',
        VIDEO: '视频免费',
        DIAMOND_NOT_ENOUGH: '钻石不足',
    },

    //@en--------------music data-------------------
    //@zh--------------音效 数据-------------------
    MUSIC_LIST: { //音效名称
        CLICK: 'click',
        WALK: 'walk', //未做
        JUMP: 'jump',
        GETBEICK: 'getBrick',
        PUTBRICK: 'putBrick',
        BUMP: 'bump',
        FALL: 'fall',
        GETDIAMOND: 'getDiamond',
        WIN: 'win',
        RUNFAST: 'runFast',
        COUNTDOWN: 'countdown',
        COUNTDOWN_END: 'countdownEnd',
        DEAD: 'dead',
        REWARDMUL: 'rewardMul',
    },

    MUSIC_RANDOM: { //音效随机最大值 1-n
        WALK: 5,
        GETBEICK: 5,
    },

    //@en--------------effect data-------------------
    //@zh--------------特效 数据-------------------
    EFFECT_LIST: {
        BRICK: 'brickSet', //砖块特效——拾取、铺设
        END_ROAD: 'colorBar', //结束地面特效
        REWARD_ROAD: 'activation', //倍数地面特效
        RUNFAST: 'flyLight', //加速特效
        FALL_WATER: 'waterSpray', //落水特效
    },

    FALL_WATER_EFF_Y: -0.15, //落水特效y轴

    //@en--------------event data-------------------
    //@zh--------------事件 数据-------------------
    CLIENTEVENT_LIST: {
        CHANGECAMERATYPE: 'changeCameraType',
        RESTARTGAME: 'restartGame',
        ADDROLEBRICK: 'addRoleBrick',
        TOUCHMOVEPLAYER: 'touchMovePlayer',
        RESURRECTIONPLAYER: 'resurrectionPlayer',
    },

    //@en----------------panel data-----------------
    //@zh----------------界面 数据-----------------
    PANEL_PATH: {
        MAIN_PANEL: 'main/mainPanel',
        SETTING_PANEL: 'setting/settingPanel',
        GAME_PANEL: 'game/gamePanel',
        RESURRECTION_PANEL: 'resurrection/resurrectionPanel',
        GAMEOVER_PANEL: 'gameOver/gameOverPanel',
        TIPS_PANEL: 'common/tips',
        CLOSEPANEL: 'close/closePanel',
    },

    //--------------collider data-------------------
    //--------------碰撞 数据-------------------
    COLLIDER_GROUP_LIST: { //碰撞分组/掩码
        DEFAULT: 1 << 0,
        PLAYER: 1 << 1,
        FLOOR: 1 << 2,
        AI: 1 << 3,
    },

    COLLIDER_ROLE_BOX_SIZE: new Vec3(0.15, 0.52, 0.15), //人物的碰撞盒大小

    COLLIDER_ROLE_BOX_CENTER: new Vec3(0, 0.24, 0), //人物的碰撞盒中心

    //--------------camera data-------------------
    //--------------摄像机 数据-------------------
    CAMERA_READY_DATA: { //相对于角色，游戏开始阶段摄像机数据
        offsetPosInit: new Vec3(0, 1.1, 2.2),
        offsetLookAtPos: new Vec3(0, 0.3, 0),
    },

    CAMERA_PLAYING_DATA: { //相对于角色，游戏过程中摄像机数据
        offsetPosInit: new Vec3(0, 1.5, 3),
        offsetLookAtPos: new Vec3(0, 0, 0),
    },

    CAMERA_ADDBRICK_OFFSET: new Vec3(0, 0.0225, 0.045), //每拾取一块砖的摄像机偏移坐标

    CAMERA_ENDROAD_DATA: { //相对于终点平台，结算阶段摄像机数据
        offsetPosInit: new Vec3(0, 0.9, 2.6),
        offsetLookAtPos: new Vec3(0, 0.3, 0),
    },

    CAMERA_REWARDROAD_DATA: { //相对于奖励平台，结算阶段摄像机数据
        offsetPosInit: new Vec3(0, 2.5, 3.5),
        offsetLookAtPos: new Vec3(0, -0.8, 0),
    },

    CAMERA_TYPE_LIST: { //摄像机类型
        READY: 0, //准备
        READY_TO_PLAYING: 1, //准备过度到游戏
        PLAYING: 2, //游戏过程中
        SWOOP: 3, //飞扑阶段
        ENDROAD: 4, //结束地面
        REWARD: 5, //结束奖励翻倍
    },

    CAMERA_MAX_BRICKNUM: 20, //摄像机拍摄的最大砖块远度

    //--------------skin data-------------------
    //--------------皮肤 数据-------------------
    SKIN_MODEL_PATH: 'role/girl', //皮肤模型路径 + 模型编号

    SKIN_MAT_PATH: 'roleMat/girl', //皮肤材质路径 + SKIN_ID_LIST中id

    SKIN_ID_LIST: [//[模型编号*10+皮肤编号]
        0, 1, 2,
        10, 11
    ],

    BRICKSKIN_COUNT: 1, //砖块总数 从0开始

    //--------------player data-------------------
    //--------------角色(ai 玩家 公用) 数据-------------------
    ROLE_STATE_LIST: { //角色状态列表
        IDLE: 1,
        IDLE_TAKE_BRICK: 2,
        RUN: 3,
        RUN_TAKE_BRICK: 4,
        PUT_BRICK: 5,
        JUMP: 6,
        SWOOP: 7,
        CLIMB: 8,
        FALL: 9,
        WIN: 10,
        FAIL: 11,
        BUMP: 12,
    },

    ROLE_STATE_NAME: new Map([//状态对应动画名称
        [1, 'idle01'],
        [2, 'idle02'],
        [3, 'run'],
        [4, 'move'],
        [5, 'move01'],
        [6, 'jump'],
        [7, 'jump01'],
        [8, 'climb1'],
        [9, 'fall'],
        [10, 'win'],
        [11, 'fail',],
        [12, 'jump01'],
    ]),

    ROLE_FACE_DIRECTION: { //角色朝向摄像机
        FRONT: 1, //正面
        BACK: 2, //背面
        RIGHT_FRONT: 3, //右前
        LEFT_FRONT: 4, //左前
    },

    ROLE_SPEED_Y_JUMP_START: 1.85, //跳跃开始的速度

    ROLE_GRAVITY_JUMP: -6, //跳跃所受重力

    ROLE_SPEED_Y_SWOOP_DOWN: 0.8, //角色飞扑下落速度

    ROLE_SWOOP_DEATH: -0.24, //角色飞扑到达一定y值死亡

    ROLE_CHECK_SWOOP_Y: 0.04, //判断为飞扑的高度

    ROLE_CHECK_FALL_WATER_EFF_Y: -0.25, //判断播放掉水中的特效y坐标

    //--------------player data-------------------
    //--------------玩家 数据-------------------
    PLAYER_SPEED_RUN: 2, //角色不带砖移动速度

    PLAYER_SPEED_ON_BRICK: 3.5, //角色在砖块上的速度

    PLAYER_CLIMB_DOWN_RANGE: 0.33, //攀爬最低点的距离路面的位置

    PLAYER_CLIMB_DOWN_Y: -0.23, //攀爬最低点高度

    PLAYER_CLIMB_CHECK_RANGE: 0.2, //攀爬判断距离

    PLAYER_BUMP_AI_DISTANCE: 0.3, //主角在加速的情况下 与ai<=这个距离 将撞飞敌人

    //--------------ai data-------------------
    //--------------ai 数据-------------------
    AI_NUM: 3, //游戏中的ai数量 需要同步添加AI_INIT_POS_LIST

    AI_SPEED_RUN: 2 * 8.4, //角色不带砖移动速度

    AI_SPEED_ON_BRICK: 3.5 * 8.4, //角色在砖块上的速度

    AI_OFFSET_MAX: 0.4, //ai最大偏差位移（比0.4大可能出现弯道出赛道状况）

    AI_SPEED_BUMP: 0.7, //ai被撞飞之后的速度

    AI_SPEED_Y_BUMP_START: 4, //撞飞后开始的速度

    AI_GRAVITY_BUMP: -3, //撞飞后所受重力

    AI_CHECK_HIDE_Y: -3, //ai下落到一定高度隐藏

    AI_INIT_POS_LIST: new Map([ //ai起始位置
        [1, new Vec3(0.3, 0, -0.63)],
        [2, new Vec3(-0.3, 0, -0.91)],
        [3, new Vec3(0.3, 0, -1.39)],
    ]),

    //--------------aiWay data-------------------
    //--------------ai路径 数据-------------------
    AIWAY_TWO_POINT_RANGE: 0.11, //ai的贝塞尔曲线数据 计算贝塞尔的区间距离

    AIWAY_NAME: 'aiWay', //导出的ai路径命名 例：aiWay1.json 

    AIWAY_PATH_IN_RESOURCES: 'aiWayData', //在resources下的文件夹名称

    //----------------brick data-----------------
    //----------------砖块 数据-----------------
    BRICK_ONCE_HEIGHT: 0.1, //一块砖块高度——持有砖块堆叠所需参数

    BRICK_ONCE_CHECK_RANGE: 0.18, //一块砖块的宽高/地面砖块初始大小

    BRICK_ONCE_SIZE_HAND_INIT: 0.6, //一个砖块在手上的大小

    BRICK_ONCE_SIZE_DOWN_MAX: 0.25, //一个砖块刚铺设在地上的大小(大->原大小过程的 大的大小)

    BRICK_ONCE_SIZE_DOWN_INIT: 0.18, //一块砖块的宽高/地面砖块初始大小

    BRICK_CAN_GET_RANGE: 0.1, //可以拾取砖块的距离

    BRICK_CAN_GET_INTERVAL: 1, //地图内可拾取砖块的区间间隔

    BRICK_FLOOR_DOWN_Y: -0.033, //砖块铺设到地面上时的y轴坐标

    BRICK_PRODUCTION_TIME: 3, //砖块重新生成时间——单位:秒

    BRICK_SHAKE_MIN: 20, //手上的砖块可以晃动的最低数量

    BRICK_SHAKE_HALF_TIME: 0.25, //时间内完成一次从中间到左或右的倾斜

    BRICK_SHAKE_GRADIENT: 0.25, //砖块晃动倾斜度

    BRICK_HAND_OFFSET_X: 0.162, //持有时的坐标偏差x

    BRICK_HAND_OFFSET_Z: 0.041, //持有时的坐标偏差z

    //@zh----------------csv data-----------------
    //@zh----------------csv对应数据-----------------
    CSV_TYPE_BRICKLAYER: 'brickLayer', //module中的砖块堆type名称

    CSV_BRICK_LAYER_DATA: new Map([//初始化取表格中的数据生成砖块堆
        //例如：[2001, [3, 2]] 2001代表这从下往上 最接近地面的第一层有3个砖块，往上第二层有2个砖块
    ]
    ),

    CSV_MAP_ITEM_RANGE: {//地图物件取值范围
        ROAD: [1000, 2000], //路面区间
        BRICK_LAYER: [2000, 3000], //砖块堆区间
    },

    CSV_MAP_ITEM_NAME: { //地图中物件对应名称————与modul.csv相对应
        ROAD_END: '1010', //结束地面 
        ROAD_END_REWARD: '1011', //奖励倍数地面
        FINISH_LINE: 'finishLine', //完成线
    },

    //@zh----------------brickLayer data-----------------
    //@zh----------------砖块堆 数据-----------------
    BRICK_LAYER_ONCE_Z: 0.18, //每个砖块z间隔

    BRICK_LAYER_ONCE_Y: 0.04, //每个砖块y间隔

    //@en----------------endRoad data-----------------
    //@zh----------------结尾路面 数据-----------------
    ROAD_END_POS_LIST: [ //终点站位——相对于终点地面的坐标
        new Vec3(0, 0, -1.25),
        new Vec3(-0.262, 0, -1.489),
        new Vec3(0.262, 0, -1.489),
        new Vec3(-0.59, 0, -1.653),
        new Vec3(0.59, 0, -1.653),
    ],

    //@en----------------endReward data-----------------
    //@zh----------------结尾奖励 数据-----------------
    REWARD_START_TRANSVERSE: 1, //距离结束地面距离（因锚点位置产生的偏移量）

    REWARD_CIRCLR_COUNT: 15, //倍数地面的个数

    REWARD_TRANSVERSE_RANGE_HALF: 1.5, //奖励路面横向随机区间

    REWARD_LONGITUDINAL_RANGE_HALF: 1.2, //奖励路面纵向随机区间一半 (纵向仅往结束地面的后方 前方为赛道)

    REWARD_SIZE: 1.7, //结尾奖励地面大小

    REWARD_LAST_SCALE_NUM: 2, //最后一个奖励地面大小

    //@en--------------mainPanel data-------------------  
    //@zh--------------主界面 数据-------------------
    MAIN_BASIS_DIAMOND: 100, //主界面钻石基础价格

    MAIN_BASIS_BRICK: 100, //主界面基础砖块价格

    MAIN_MUL: 1.2, //主界面价格增长数

    //@en--------------gamePanel data-------------------
    //@zh--------------游戏界面 数据-------------------
    GAME_TOUCH_MUL: 9, //游戏界面的左右移动角度的倍数

    TOUCH_MOVE_CHECK_NAX: 180, //当滑动距离大于当前数值时，角色砖块晃动朝反方向固定

    //@en--------------resurrectionPanel data-------------------
    //@zh--------------复活界面 数据-------------------
    RESURR_PLAYER_ADD_BRICK_NUM: 10, //复活后角色手上增加的砖块数量

    RESURR_COUNTDOWN_TIME: 6, //倒计时时间

    RESURR_TIME_TO_SHOW_NEXT: 4, //显示继续按钮的时间

    //@en--------------gameOverPanel data-------------------  
    //@zh--------------结束界面 数据-------------------
    GAMEOVER_BASIS_DIAMOND: 100, //结束界面基础奖励

    //@en--------------diamondAni data-------------------  
    //@zh--------------钻石动画 数据-------------------
    DIAMONDFLY_REWARD_PRIORITY: 900, //结束界面基础奖励

    //@en--------------level data-------------------  
    //@zh--------------关卡数 数据-------------------
    MAX_LEVEL_NUM: 2, //当前最大关卡数
}
export { gameConstants }