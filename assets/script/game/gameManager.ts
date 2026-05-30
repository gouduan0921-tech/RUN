import { _decorator, Component, Node, Collider, Vec3, resources, Prefab, RigidBody, instantiate, MeshRenderer, macro, Material, find, JsonAsset, BoxCollider, game, sys, utils, PhysicsSystem, Game } from 'cc';
import { clientEvent } from '../framework/clientEvent';
import { localConfig } from '../framework/localConfig';
import { playerData } from '../framework/playerData';
import { poolManager } from '../framework/poolManager';
import { resourceUtil } from '../framework/resourceUtil';
import { uiManager } from '../framework/uiManager';
import { gameUtils } from './utils/gameUtils';
import { gameConstants } from './utils/gameConstants';
import { util } from '../framework/util';
import { StorageManager } from '../framework/storageManager';
import { Ai } from './role/ai';
import { AudioManager } from '../framework/audioManager';
const { ccclass, property } = _decorator;
//注：————不写Player/Ai类型原因：网页浏览没问题，打包会认为roleBase、Player、GameManager 相互引用报错
@ccclass('GameManager')
export class GameManager extends Component {
    @property(Material)
    matNumList: Array<Material> = []; //数字的材质列表 0-9

    public static pfBrickList: Array<Prefab> = []; //砖块的列表
    public static scriptAiList: Array<any> = []; //ai脚本的存储列表
    public static scriptPlayer: any = null!; //主角脚本
    public static ndBrickFloor: Node = null!; //铺设在地面上的砖块的父节点
    public static canGetBrickList: any = {}; //场景内可以获取的砖块列表
    public static isGameStart: boolean = false;
    public static isWin: boolean = false;
    public static arriveRoadEndNum: number = 0; //到达结束地面人数
    public static ndRoadEnd: Node = null!; //终点地面节点
    public static ndEndReward: Node = null!; //终点地面节点 ————取当前倍数 Number(ndEndReward.children[0].name)
    public static ndRewardCircle: Node = null!; //结尾奖励阶段圆台父节点
    public static aiSkinList: Array<number> = []; //当前ai可随机皮肤
    public static isLowPhone: boolean = null!; //是否为低端机

    public ndMap: Node = null!; //地图父节点

    private _cbIdToWaitShowPanel: any = null!;
    private _ndEffectParent: Node = null!; //特效的父节点
    private _mapDataCount: number = 0; //所有待加载物件数量
    private _isLoadRoadNum: number = 0; //当前加载路面数量
    private _isLoadBrickNum: number = 0; //当前砖块数量
    private _isInitAiNum: boolean = false; //是否初始化ai数量
    private _onGameHide = () => {
        if (!playerData.instance.settings) {
            playerData.instance.settings = {}
        }

        playerData.instance.settings.hideTime = Date.now();
        playerData.instance.saveAll();
        StorageManager.instance.save();
    };

    onLoad() {
        //@ts-ignore
        if (window.cocosAnalytics) {
            //@ts-ignore
            window.cocosAnalytics.init({
                appID: "683896164",              // 游戏ID
                version: '1.0.0',           // 游戏/应用版本号
                storeID: sys.platform.toString(),     // 分发渠道
                engine: "cocos",            // 游戏引擎
            });
        }
        
        //初始化音乐
        AudioManager.instance.init();

        //存储数据处理
        playerData.instance.loadGlobalCache();
        if (!playerData.instance.userId) {
            playerData.instance.generateRandomAccount();
            console.log("###生成随机userId", playerData.instance.userId);
        }

        playerData.instance.loadFromCache();

        if (!playerData.instance.playerInfo || !playerData.instance.playerInfo.createDate) {
            playerData.instance.createPlayerInfo();
        }

        //记录离线时间
        game.on(Game.EVENT_HIDE, this._onGameHide, this)

        this.getAllHandBrickPre();

        clientEvent.on(gameConstants.CLIENTEVENT_LIST.RESTARTGAME, this._initGame, this);

        this.ndMap = this.node.getChildByName('map')!;
        this._ndEffectParent = find('effectManager')!;
        GameManager.ndRewardCircle = this.node.getChildByName('rewardCircle')!;
        GameManager.ndBrickFloor = this.node.getChildByName('brickFloor')!;
    }

    onDestroy() {
        game.off(Game.EVENT_HIDE, this._onGameHide, this);
        clientEvent.targetOff(this);
        this._clearWaitShowPanelTimer();
    }

    /**
     * 加载所有砖块预制体
     */
    private getAllHandBrickPre() {
        this._isLoadBrickNum = 0;
        resourceUtil.loadModelRes('brick/brick0').then((prefab: any) => {
            GameManager.pfBrickList[0] = prefab;

            poolManager.instance.prePool(prefab, 40);

            this._isLoadBrickNum++;

            this.setAllRoleBrickId();
        })
    }

    /**
     * 设置所有人物的砖块id
     */
    private setAllRoleBrickId() {
        if (this._isLoadBrickNum === gameConstants.BRICKSKIN_COUNT && GameManager.scriptPlayer &&
            GameManager.scriptAiList.length === gameConstants.AI_NUM) {
            //目前只有一种砖块
            GameManager.scriptPlayer.brickId = 0;
            for (let i = 0; i < GameManager.scriptAiList.length; i++) {
                GameManager.scriptAiList[i].brickId = 0;
            }
        }
    }

    start() {
        //加载CSV相关配置
        localConfig.instance.loadConfig(() => {
            //初始化module.csv 中配置的砖块堆信息
            const moduleTable = localConfig.instance.getTable('module');
            for (let keyName in moduleTable) {
                const nowData = moduleTable[keyName];
                if (nowData.type === gameConstants.CSV_TYPE_BRICKLAYER) {
                    let splitList = nowData.brickLayerData.split('/');
                    for (let i = 0; i < splitList.length; i++) {
                        splitList[i] = Number(splitList[i]);
                    }
                    gameConstants.CSV_BRICK_LAYER_DATA.set(Number(keyName), splitList);
                }
            }

            this._initGame();
        })
    }

    /**
     * 初始化游戏
     */
    private _initGame() {
        this._clearWaitShowPanelTimer();

        GameManager.arriveRoadEndNum = 0;
        GameManager.isGameStart = false;
        GameManager.isWin = false;
        GameManager.canGetBrickList = {};
        GameManager.ndBrickFloor.destroyAllChildren();

        const playerSkinId = playerData.instance.playerInfo['roleSkinId'];
        GameManager.aiSkinList.length = 0;
        for (let j = 0; j < gameConstants.SKIN_ID_LIST.length; j++) {
            const checkSkin = gameConstants.SKIN_ID_LIST[j];
            if (playerSkinId === checkSkin) continue;
            GameManager.aiSkinList.push(checkSkin);
        }

        let level = playerData.instance.playerInfo['level'];
        if (level > gameConstants.MAX_LEVEL_NUM) {
            level = Math.ceil(Math.random() * gameConstants.MAX_LEVEL_NUM);
        }

        this._loadMap(level);

        while (this._ndEffectParent.children.length > 0) {
            poolManager.instance.putNode(this._ndEffectParent.children[0]);
        }

        if (!GameManager.scriptPlayer) {
            const ndPlayer = new Node('player');
            ndPlayer.parent = this.node;

            GameManager.scriptPlayer = ndPlayer.addComponent('Player')!;
            GameManager.scriptPlayer.createPlayer();
        }
        GameManager.scriptPlayer.initPlayer();
        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.CHANGECAMERATYPE, gameConstants.CAMERA_TYPE_LIST.READY);

        if (!this._isInitAiNum && util.checkIsLowPhone()) {
            gameConstants.AI_NUM = 2;
            this._isInitAiNum = true;
        }

        const aiNum = gameConstants.AI_NUM;
        const aiWayPath = gameConstants.AIWAY_PATH_IN_RESOURCES + '/' + gameConstants.AIWAY_NAME + level;
        resourceUtil.loadRes(aiWayPath, JsonAsset, (err: any, data: any) => {
            if (GameManager.scriptAiList.length === gameConstants.AI_NUM) {
                for (let i = 1; i < aiNum + 1; i++) {
                    this.loadAiBezier(
                        data.json,
                        gameConstants.AI_INIT_POS_LIST.get(i) || new Vec3(-100, 0, 0),
                        (bezierList: any) => {
                            GameManager.scriptAiList[i - 1].initAi(i, bezierList);
                        })

                    if (i === aiNum) {
                        this.setAllRoleBrickId();
                    }
                }
            } else {
                for (let i = 1; i < aiNum + 1; i++) {
                    this.loadAiBezier(
                        data.json,
                        gameConstants.AI_INIT_POS_LIST.get(i) || new Vec3(-100, 0, 0),
                        (bezierList: any) => {
                            const ndAi = new Node('ai' + i);
                            ndAi.parent = this.node;

                            //同player脚本不定义一样 会有脚本之间互相引用报错问题
                            const scriptsAi = ndAi.addComponent('Ai')! as Ai;
                            scriptsAi.createAi(i, bezierList);
                        })

                    if (i === aiNum) {
                        this.setAllRoleBrickId();
                    }
                }
            }
        })

    }

    /**
     * 加载ai贝塞尔数据
     * @param data 
     * @param aiInitPosData 
     * @param cb 
     */
    private loadAiBezier(data: any, aiInitPosData: Vec3, cb: any) {
        gameUtils.getBezierCalculateList(
            data,
            aiInitPosData.x,
            gameUtils.getAiDataToBezierList(aiInitPosData),
            cb
        )
    }

    /**
     * 加载当前关卡地图
     */
    private _loadMap(level: number) {
        const mapData = localConfig.instance.getTable('map' + level);

        while (this.ndMap.children.length > 0) {
            poolManager.instance.putNode(this.ndMap.children[0]);
        }

        this._isLoadRoadNum = 0;
        this._mapDataCount = 0;
        for (let i in mapData) {
            let itemData = mapData[i];
            const itemName = Number(itemData.name);
            if (itemName > gameConstants.CSV_MAP_ITEM_RANGE.BRICK_LAYER[0] &&
                itemName < gameConstants.CSV_MAP_ITEM_RANGE.BRICK_LAYER[1]) {
                resourceUtil.loadModelRes('brick/brickInRoad').then((prefab: any) => {
                    // return;
                    const brickLayerData = gameConstants.CSV_BRICK_LAYER_DATA.get(itemName) as Array<number>;
                    if (!brickLayerData) { //避免出现错误的砖块堆信息
                        console.error('error brickLayer:', itemName);
                        return;
                    }

                    const nowEul = new Vec3(0, Number(itemData.eulY), 0);
                    const nowPos = gameUtils.setStringToVec3(itemData.position);
                    let nowMul = 0; //当前的坐标倍数
                    //正前方的xz坐标
                    let eulRad = nowEul.y * macro.RAD;
                    const addX1 = gameUtils.getDirectionOfDistanceX(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);
                    const addZ1 = gameUtils.getDirectionOfDistanceZ(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);
                    //正后方的xz坐标
                    eulRad = (180 + nowEul.y) * macro.RAD;
                    const addX2 = gameUtils.getDirectionOfDistanceX(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);
                    const addZ2 = gameUtils.getDirectionOfDistanceZ(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);
                    /*
                    1.brickLayerData.length 当前砖块堆的层数
                    2.brickLayerData[0] 代表靠近地面的第一层的个数
                    3.每一层的分布
                        1）奇数 
                            第一个砖块的z = 0;第2、3个砖块的z为+-相同数值，以此类推
                        2）偶数
                            第1，2个砖块的z为+-相同数值，以此类推
                    */
                    for (let j = 0; j < brickLayerData.length; j++) {
                        nowMul = 0;
                        const nowCount = brickLayerData[j];
                        let brickCount = 0; //当前生成砖块数量
                        let nowY = j * gameConstants.BRICK_LAYER_ONCE_Y;
                        if (nowCount % 2 === 0) { //偶数
                            nowMul = 0.5;
                        } else { //奇数
                            //创建一个当前位置的砖块
                            this._loadBrick(prefab, nowPos.clone().add3f(0, nowY, 0), nowEul);

                            brickCount++;
                            nowMul = 1;
                        }
                        while (brickCount < nowCount) {
                            //每次生成两个+-对称的砖块
                            this._loadBrick(prefab, nowPos.clone().add3f(addX1 * nowMul, nowY, addZ1 * nowMul), nowEul);
                            this._loadBrick(prefab, nowPos.clone().add3f(addX2 * nowMul, nowY, addZ2 * nowMul), nowEul);

                            nowMul += 1;
                            brickCount += 2;
                            continue;
                        }
                    }
                })
            } else if (itemName > gameConstants.CSV_MAP_ITEM_RANGE.ROAD[0] &&
                itemName < gameConstants.CSV_MAP_ITEM_RANGE.ROAD[1]) {
                this._mapDataCount++;
                this._loadRoad(itemData);
            } else {
                console.error('error getPrePath:', itemName);
            }
        }
    }

    /**
     * 加载路面上的砖块
     * @param brickPre 
     * @param pos 
     * @param eul 
     */
    private _loadBrick(brickPre: Prefab, pos: Vec3, eul: Vec3) {
        const ndNowBrick = poolManager.instance.getNode(brickPre, this.ndMap) as Node;
        ndNowBrick.setPosition(pos);
        ndNowBrick.setRotationFromEuler(eul);
        const brickSize = gameConstants.BRICK_ONCE_SIZE_DOWN_INIT;
        ndNowBrick.setScale(new Vec3(brickSize, brickSize, brickSize));

        let nowRow = gameUtils.checkNowBrickIndex(pos.x, pos.z);
        if (!GameManager.canGetBrickList[nowRow]) {
            GameManager.canGetBrickList[nowRow] = [];
        }
        GameManager.canGetBrickList[nowRow].push(ndNowBrick);
    }

    /**
     * 加载路面
     * @param itemData 
     */
    private _loadRoad(itemData: any) {
        resourceUtil.loadModelRes('road/' + itemData.name).then((prefab: any) => {
            this._isLoadRoadNum++;
            const ndItem = poolManager.instance.getNode(prefab, this.ndMap) as Node;
            ndItem.position = gameUtils.setStringToVec3(itemData.position);
            ndItem.scale = gameUtils.setStringToVec3(itemData.scale);
            ndItem.eulerAngles = new Vec3(0, Number(itemData.eulY), 0);

            if (ndItem.name === gameConstants.CSV_MAP_ITEM_NAME.ROAD_END) {
                //结尾地面需要镜头等特殊处理，因此记录该节点
                GameManager.ndRoadEnd = ndItem;
                GameManager.ndEndReward = ndItem;

                //终点线的碰撞体
                const colliderFinishLine = ndItem.getChildByName(gameConstants.CSV_MAP_ITEM_NAME.FINISH_LINE)!.getComponent(Collider)!;
                colliderFinishLine.setGroup(gameConstants.COLLIDER_GROUP_LIST.FLOOR);
                colliderFinishLine.setMask(gameUtils.getAiAndPlayerGroup());
            }

            //设置地板的 分组，掩码
            let colliderList = ndItem.getComponents(Collider)!;
            for (let j = 0; j < colliderList.length; j++) {
                colliderList[j].setGroup(gameConstants.COLLIDER_GROUP_LIST.FLOOR);
                colliderList[j].setMask(gameUtils.getAiAndPlayerGroup());
            }

            this._checkLoadFinish();
        })
    }

    /**
     * 判断是否加载地图完毕
     */
    private _checkLoadFinish() {
        if (this._isLoadRoadNum === this._mapDataCount) {
            this.initEndRewardCircle();

            this._clearWaitShowPanelTimer();
            this._cbIdToWaitShowPanel = setInterval(() => {
                if (this._isLoadBrickNum !== gameConstants.BRICKSKIN_COUNT) return;

                //低端机判断
                if (GameManager.isLowPhone === null && util.checkIsLowPhone()) {
                    GameManager.isLowPhone = true;
                    game.setFrameRate(40);
                }

                this._clearWaitShowPanelTimer();
                uiManager.instance.showDialog(gameConstants.PANEL_PATH.MAIN_PANEL);
            }, 50);
        }
    }

    private _clearWaitShowPanelTimer() {
        if (!this._cbIdToWaitShowPanel) {
            return;
        }

        clearInterval(this._cbIdToWaitShowPanel);
        this._cbIdToWaitShowPanel = null!;
    }

    /**
     * 初始化结束的奖励倍数
     */
    public initEndRewardCircle() {
        if (GameManager.ndRewardCircle.children.length === gameConstants.REWARD_CIRCLR_COUNT - 1) {
            this.reSetEndRewardCircle();
        } else {
            //x2开始 结尾地板算x1
            resourceUtil.loadModelRes('road/' + gameConstants.CSV_MAP_ITEM_NAME.ROAD_END_REWARD).then((prefab: any) => {
                for (let i = 1; i < gameConstants.REWARD_CIRCLR_COUNT; i++) {
                    const ndEndCircle = poolManager.instance.getNode(prefab, GameManager.ndRewardCircle) as Node;

                    //同样设置分组
                    let colliderList = ndEndCircle.getComponents(Collider)!;
                    for (let j = 0; j < colliderList.length; j++) {
                        colliderList[j].setGroup(gameConstants.COLLIDER_GROUP_LIST.FLOOR);
                        colliderList[j].setMask(gameConstants.COLLIDER_GROUP_LIST.PLAYER);
                    }

                    if (i + 1 > 9) {
                        let nowPos = new Vec3();
                        nowPos.set(-0.37, 0.01, 0);
                        ndEndCircle.children[1].setPosition(nowPos); //第一个子节点为乘号

                        const ndNum = ndEndCircle.children[2]; //第二个子节点为数字 10以上的十位数位数
                        nowPos.set(0.01, 0.01, 0);
                        ndNum?.setPosition(nowPos);

                        const ndNewNum = instantiate(ndNum); //10以上的个位数
                        ndNewNum.parent = ndEndCircle;
                        nowPos.set(0.4, 0.01, 0);
                        ndNewNum.setPosition(nowPos);
                        ndNewNum.getComponent(MeshRenderer)!.setMaterial(this.matNumList[i - 10 + 1], 0);
                    } else {
                        const ndNum = ndEndCircle.children[2]; //第二个子节点为数字 10以上的十位数位数
                        ndNum.getComponent(MeshRenderer)!.setMaterial(this.matNumList[i + 1], 0);
                    }

                    //将第一个节点的名字改为当前倍数编号 取倍数编号直接取当前节点名称
                    ndEndCircle.children[0].name = (i + 1).toString(); //通过读取这个节点->name 确定当前所在倍数地面的倍数

                    if (i === gameConstants.REWARD_CIRCLR_COUNT - 1) {
                        //最后一个特殊处理 大小
                        const endScaleNum = gameConstants.REWARD_LAST_SCALE_NUM;
                        const nowScale = ndEndCircle.getScale();
                        nowScale.x = endScaleNum;
                        nowScale.z = endScaleNum;
                        ndEndCircle.setScale(nowScale);

                        //在设置完所有节点的分组之前隐藏，则会报错
                        //并且初始化所有的坐标
                        this.reSetEndRewardCircle();
                    }
                }
            })
        }
    }

    /**
     * 重制奖励倍数圆台的坐标
     */
    private reSetEndRewardCircle() {
        GameManager.ndRewardCircle.active = false;

        const addEulRad = GameManager.ndRoadEnd.eulerAngles.y * macro.RAD; //当前角度朝向
        let startPos = GameManager.ndRoadEnd.getPosition(); //记录上一个节点的位置（总是在终点的正前方的节点，方便计算下一个节点的随机值）
        startPos.subtract3f( //由于终点的锚点存在偏差 因此先计算出终点的具体坐标
            gameUtils.getDirectionOfDistanceX(gameConstants.REWARD_START_TRANSVERSE, addEulRad),
            0,
            gameUtils.getDirectionOfDistanceZ(gameConstants.REWARD_START_TRANSVERSE, addEulRad)
        )

        let interval = gameConstants.REWARD_SIZE + 0;
        let pos = new Vec3();
        let eul = GameManager.ndRoadEnd.eulerAngles.clone();
        const getRandomLongitudinal = () => { //纵向随机值——仅允许终点往后 因此随机值只存在正数
            return interval + gameUtils.getRandomRange(gameConstants.REWARD_LONGITUDINAL_RANGE_HALF);
        }
        const getRandomTransverse = () => {//横向随机值——存在左右区间的可能性 所以 随机值允许正负类型数值
            return gameUtils.getRandomRange(gameConstants.REWARD_TRANSVERSE_RANGE_HALF, true);
        }
        for (let i = 1; i < gameConstants.REWARD_CIRCLR_COUNT; i++) {
            let ndItem = GameManager.ndRewardCircle.children[i - 1];

            if (i === gameConstants.REWARD_CIRCLR_COUNT - 1) { //最后一个地面大小不一样 因此间隔不一样
                interval += gameConstants.REWARD_LAST_SCALE_NUM / 2;
            }

            //往终点的正前朝向 计算出当前相对于终点往后的每个倍数台的纵向坐标
            let randomX = gameUtils.getDirectionOfDistanceX(getRandomLongitudinal(), addEulRad);
            let randomZ = gameUtils.getDirectionOfDistanceZ(getRandomLongitudinal(), addEulRad);

            startPos.x -= randomX;
            startPos.z -= randomZ;

            pos.set(startPos);

            if (i === gameConstants.REWARD_CIRCLR_COUNT - 1) {
                //最后一个特殊处理
                ndItem.setPosition(pos);
                ndItem.setRotationFromEuler(eul);
            } else {
                //往终点的正前的垂直角度（+-90度都可）   计算出当前相对于终点往后的每个倍数台的横向坐标
                const nextEulRad = (GameManager.ndRoadEnd.eulerAngles.y + 90) * macro.RAD
                let offsetTransverseX = gameUtils.getDirectionOfDistanceX(getRandomTransverse(), nextEulRad)
                let offsetTransverseZ = gameUtils.getDirectionOfDistanceZ(getRandomTransverse(), nextEulRad)

                pos.add3f(offsetTransverseX, 0, offsetTransverseZ);
                ndItem.setPosition(pos);
                ndItem.setRotationFromEuler(eul);
            }
        }
    }
}
