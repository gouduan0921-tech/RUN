
import { _decorator, Component, Node, CCString, CCBoolean, CCInteger, instantiate, Vec3 } from 'cc';
import { gameConstants } from '../utils/gameConstants';
import { gameUtils } from '../utils/gameUtils';
import { AiWayItem } from './aiWayItem';
import { mapConstants } from './mapConstants';
const { ccclass, property } = _decorator;

const MAP_PREFIX = 'aiWay'; //导出关卡的命名 aiWay.json
const MAP_PATH = 'assets/resources/'; //项目内关卡路径
/*
当前数据保存为json格式 策划不需要打开源文件编辑

aiWay 脚本节点 
------way 存放当前路径
          从1开始命名节点名称 999结束
------draw 绘画出当前贝塞尔曲线
------Sphere 绘制贝塞尔曲线的球（删除了就无法绘制贝塞尔曲线）
------wayCube 设置贝塞尔的方块（删除了 生成贝塞尔配置报错）
 */
@ccclass('AiWay')
export class AiWay extends Component {
    @property(Node)
    ndDrawPre: Node = null!; //绘制贝塞尔曲线的圆球

    @property(Node)
    ndWayCubePre: Node = null!; //绘制线路的矩形

    @property({   displayName: ' ' })
    test1: string = mapConstants.AIWAY_STRING.SAVE_BEZIER_DATA;
    @property({ type: CCInteger, min: 1, step: 1, displayName: mapConstants.AIWAY_STRING.SAVE_BEZIER_NUM })
    mapNameSave: number = 1;

    _isFinish1 = true;
    @property({   displayName: mapConstants.AIWAY_STRING.SAVE_BEZIER_CHECK })
    get getMapData() {
        return !this._isFinish1;
    }
    set getMapData(v) {
        if (!this._isFinish1) {
            return;
        }
        console.log(mapConstants.COMMON.START_CALCULATE);
        this._isFinish1 = false;

        this._saveAiWay();
    }
    @property({   displayName: ' ' })
    test2: string = mapConstants.AIWAY_STRING.LOAD_BEZIER_DATA;
    @property({ type: CCInteger, min: 1, step: 1, displayName: mapConstants.AIWAY_STRING.LOAD_BEZIER_NUM })
    mapNameLoad: number = 1;

    _isFinish2 = true;
    @property({   displayName: mapConstants.AIWAY_STRING.LOAD_BEZIER_CHECK })
    get setMapData() {
        return !this._isFinish2;
    }
    set setMapData(v) {
        if (!this._isFinish2) {
            return;
        }
        console.log(mapConstants.COMMON.START_CALCULATE);
        this._isFinish2 = false;

        this._loadAiWay();
    }
    @property({   displayName: ' ' })
    test3: string = mapConstants.AIWAY_STRING.SHOW_WAY;
    @property({   displayName: mapConstants.AIWAY_STRING.SHOW_WAY })
    isShowBezierWay: boolean = false;

    @property({ type: CCInteger, displayName: mapConstants.AIWAY_STRING.SHOW_WAY_DATA, min: 1 })
    bezierWayNum: number = 1;

    private ndDraw: Node = null!;
    private ndWay: Node = null!;

    /**
     * 初始化节点信息
     */
    private initNode() {
        this.ndDraw = this.node.getChildByName('draw')!;
        this.ndWay = this.node.getChildByName('way')!;

        this.ndDraw.destroyAllChildren();
    }

    /**
     * 保存当前的ai路径
     */
    private _saveAiWay() {
        this.initNode();

        const ndNowGetBezier = this.ndWay;
        const mapBezierData = {};
        for (let i = 0; i < ndNowGetBezier.children.length; i++) {
            if (!ndNowGetBezier.children[i].active) continue;
            const nowItem = ndNowGetBezier.children[i];
            const nowId = Number(nowItem.name);
            if (nowId === 0) continue; //i为0的情况为主角自身的信息 不需要创建

            const nextIdStringList = nowItem.getComponent(AiWayItem)?.nextIdString!.split(',')!;
            let nextIdList = []
            for (let j = 0; j < nextIdStringList.length; j++) {
                if (nowId === 999) continue; //自己为999 结束点时 不需要判断
                if (nextIdStringList[j] === nowItem.name) {
                    console.error('当前节点 与 下一节点 命名相同 name:', nowId);
                    return;
                } else if (nextIdStringList[j] === '') {
                    //特殊情况 当前的下一个目标未指向正确数字，自身+1
                    nextIdList[j] = nowId + 1;
                    if (!ndNowGetBezier.getChildByName((nowId + 1).toString())) {
                        //未查找到当前节点
                        console.error('不存在 当前自动匹配的下一点 name:', nowId + 1);
                        console.error('当前节点名称 name:', nowId);
                        //匹配999 终点
                        nextIdList[j] = 999;
                        console.error('自动匹配 999');
                    }
                } else {
                    nextIdList[j] = Number(nextIdStringList[j]);
                }
            }

            mapBezierData[nowId] = {
                nextIdList,
                pos: {
                    x: Number((nowItem.worldPosition.x).toFixed(2)),
                    z: Number((nowItem.worldPosition.z).toFixed(2)),
                },
                // range: {
                //     x: Number((nowItem.scale.x).toFixed(2)),
                //     z: Number((nowItem.scale.z).toFixed(2)),
                // },
                eulY: Math.round(nowItem.eulerAngles.y) % 360,
                isBendEnd: nowItem.getComponent(AiWayItem)?.isBendEnd,
            }
        }
        // console.error('当前地图ai路径数据', mapBezierData);

        //保存为json文件
        const projectPath = window.cce.project as string;
        projectPath.replace("\\", " / ");
        const fileName = MAP_PREFIX + this.mapNameSave + '.json';
        const filePath = `${projectPath}/` + MAP_PATH + gameConstants.AIWAY_PATH_IN_RESOURCES + '/';
        console.log("开始生成:", fileName);
        console.warn("当前生成关卡路径:", filePath + fileName);
        const fs = require('fs');

        const mapBezierDataString = JSON.stringify(mapBezierData)

        const writeToJson = () => {
            fs.writeFile(filePath + fileName, mapBezierDataString, (err: Error) => {
                if (err) {
                    console.error("生成第" + this.mapNameSave + "关 ai路径 失败:", err);
                } else {
                    console.warn("生成第" + this.mapNameSave + "关 ai路径 成功");
                }
                this._isFinish1 = true;
            });
        }

        fs.exists(filePath, function (e: boolean) {
            if (!e) {
                fs.mkdir(filePath, function (err: Error) {
                    if (err) {
                        console.log('创建目录失败：' + err)
                    } else {
                        console.log('创建目录成功:', filePath);
                        writeToJson();
                    }
                });
            } else {
                writeToJson();
            }
        });

        this.getBezierCalculateList(mapBezierData, gameUtils.getRandomAiOffset());

        //TODO:有空加一个判断路径会不会因为填写内容不对导致死循环的
    }

    /**
     * 获取当前的ai路径
     */
    private _loadAiWay() {
        this.initNode();

        const projectPath = window.cce.project as string;
        const filePath = `${projectPath}/` + MAP_PATH + gameConstants.AIWAY_PATH_IN_RESOURCES + '/';
        const path = filePath + MAP_PREFIX + this.mapNameLoad + '.json';
        console.warn('加载数据路径：', path)
        const fs = require('fs');
        fs.readFile(path, (err: Error, data: any) => {
            if (err) {
                return console.error('获取第' + this.mapNameLoad + '关卡 ai路径 失败', err);
            }
            const nowData = JSON.parse(data)
            console.warn('获取第' + this.mapNameLoad + '关卡 ai路径 成功')

            this.createWay(nowData);

            this.getBezierCalculateList(nowData, gameUtils.getRandomAiOffset());

            this._isFinish2 = true;
        })
    }

    /**
     * 创建保存的ai路径
     * @param nowData 
     */
    private createWay(data: any) {
        if (!this.ndWayCubePre) return;
        this.ndWay.destroyAllChildren();
        for (let i in data) {
            if (Number(i) === 0) continue; //i为0的情况为主角自身的信息 不需要创建
            const nowData = data[i];
            const nowItem = instantiate(this.ndWayCubePre);
            nowItem.parent = this.ndWay;
            nowItem.setPosition(nowData.pos.x, 0, nowData.pos.z);
            nowItem.setRotationFromEuler(new Vec3(0, nowData.eulY, 0));
            nowItem.name = i;
            nowItem.getComponent(AiWayItem)!.isBendEnd = nowData.isBendEnd;
            nowItem.getComponent(AiWayItem)!.nextIdString = nowData.nextIdList.toString()
        }
    }

    /**
    * 计算当前存储的配置计算出贝塞尔曲线
    * @param mapBezierData 
    * @param initOffset 
    * @returns  
    */
    private getBezierCalculateList(mapBezierData: any, initOffset: number) {
        if (!this.isShowBezierWay || !this.ndDrawPre) return;

        gameUtils.getBezierCalculateList(mapBezierData, initOffset,
            gameUtils.getAiDataToBezierList(new Vec3(0, 0, 0)),
            (bezierList: any) => {
                for (let l = 0; l < bezierList.length; l++) {
                    if (l % this.bezierWayNum === 0) { //少绘制贝塞尔曲线 避免电脑卡顿
                        const ndItem = instantiate(this.ndDrawPre);
                        ndItem.parent = this.ndDraw;
                        ndItem.setPosition(bezierList[l].x, 0, bezierList[l].y);
                    }
                }
            });
    }
}