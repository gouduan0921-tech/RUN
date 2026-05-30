import { _decorator, Component, Node, CCString, CCInteger, CCBoolean, Vec3, director, instantiate, path, resources, macro, MeshRenderer, Material } from 'cc';
import { gameConstants } from '../utils/gameConstants';
import { gameUtils } from '../utils/gameUtils';
import { mapConstants } from './mapConstants';
const { ccclass, property } = _decorator;

const MAP_PREFIX = 'map'; //导出关卡的命名 例第一关：map1.csv
const MAP_PATH = 'assets/resources/datas/'; //项目内关卡路径
const MAP_DATA_FIRST = '编号,对应资源编号,位置,缩放,角度' + '\n' +
    'number,string,string,string,string' + '\n' +
    'ID,name,position,scale,eulY' + '\n';
/*
1.数据保存为csv格式，策划可直接打开源文件修改关卡内的物件
2.名称都带'-'的原因：
    地图内的名称加上 '-' 是为了策划配置关卡复制或者生成副本的时候方便使用 并且避免 纯数字直接生成副本生成的节点名称不正确问题
    在游戏内使用的时候 还是以无 '-'的名称使用
3.地图中的物件都在mapItem节点中备份一份
*/
@ccclass('MapLoader')
export class MapLoader extends Component {
    @property(Material)
    matNumList: Array<Material> = []; //数字的材质列表 0-9

    @property({   displayName: ' ' })
    test1: string = mapConstants.MAPLOADER_STRING.SAVE_MAP_DATA;
    @property({ type: CCInteger, min: 1, step: 1, displayName: mapConstants.MAPLOADER_STRING.SAVE_MAP_NUM })
    mapNameSave: number = 1;

    _isFinish1 = true;
    @property({   displayName: mapConstants.MAPLOADER_STRING.SAVE_MAP_CHECK })
    get getMapData() {
        return !this._isFinish1;
    }
    set getMapData(v) {
        if (!this._isFinish1) {
            return;
        }
        console.log(mapConstants.COMMON.START_CALCULATE);
        this._isFinish1 = false;

        this._saveMap();
    }
    @property({   displayName: ' ' })
    test2: string = mapConstants.MAPLOADER_STRING.LOAD_MAP_DATA;
    @property({ type: CCInteger, min: 1, step: 1, displayName: mapConstants.MAPLOADER_STRING.LOAD_MAP_NUM })
    mapNameLoad: number = 1;

    _isFinish2 = true;
    @property({   displayName: mapConstants.MAPLOADER_STRING.LOAD_MAP_CHECK })
    get setMapData() {
        return !this._isFinish2;
    }
    set setMapData(v) {
        if (!this._isFinish2) {
            return;
        }
        console.log(mapConstants.COMMON.START_CALCULATE);
        this._isFinish2 = false;

        this._loadMap();
    }

    @property({   displayName: ' ' })
    test0: string = mapConstants.MAPLOADER_STRING.AMEND_MAPITEM_NAME1;
    _isFinish0 = true;
    @property({   displayName: mapConstants.MAPLOADER_STRING.AMEND_MAPITEM_NAME2 })
    get changeNdMapItemName() {
        return !this._isFinish0;
    }
    set changeNdMapItemName(v) {
        if (!this._isFinish0) {
            return;
        }
        console.log(mapConstants.MAPLOADER_STRING.AMEND_MAPITEM_NAME2);
        this._isFinish0 = false;

        this._changendMapItemName();
    }

    /**
     * 修改mapItem子节点都为 名称+'-'的命名
     */
    private _changendMapItemName() {
        let ndMapItem = director.getScene()?.getChildByName('mapItem')!;
        for (let i = 0; i < ndMapItem.children.length; i++) {
            ndMapItem.children[i].name = ndMapItem.children[i].name.split('-')[0] + '-';
        }
        this._isFinish0 = true;
    }
    /**
     * 保存当前配置的关卡信息
     */
    private _saveMap() {
        //关卡数据处理
        let data = MAP_DATA_FIRST + '';
        for (let i = 0; i < this.node.children.length; i++) {
            let ndItem = this.node.children[i];

            let ndName = ndItem.name;
            if (ndName.indexOf('-') !== -1) { //避免通过‘生成副本’形式的节点名称不一
                ndName = ndName.split('-')[0];
            }

            if (ndName === gameConstants.CSV_MAP_ITEM_NAME.ROAD_END_REWARD) continue; //测试的结尾倍数圆台不存储

            //坐标/大小/旋转均以最多两位小数存储
            const pos = this._getNumberToFixed2(ndItem.getPosition());
            const scale = this._getNumberToFixed2(ndItem.getScale());
            const eulY = ndItem.eulerAngles.y;//this._getNumberToFixed2(ndItem.eulerAngles.clone());
            //生成sting型数据  数据之间以,隔开 在最后加上换行\n
            let itemData = `${i + 1},${ndName},${pos},${scale},${eulY}` + '\n';
            data += itemData;
        }

        const projectPath = window.cce.project as string; //当前项目文件路径
        projectPath.replace("\\", " / ");
        const filePath = `${projectPath}/` + MAP_PATH;

        const fs = require('fs');
        const write = () => {
            fs.writeFile(filePath + MAP_PREFIX + this.mapNameSave + '.csv', data, (err: Error) => {
                if (err) {
                    console.warn(mapConstants.MAPLOADER_STRING.FAIL + ' ' + mapConstants.MAPLOADER_STRING.LEVEL + ':' + this.mapNameSave);
                    console.error("error", err);
                } else {
                    console.warn(mapConstants.MAPLOADER_STRING.SUCCESS + ' ' + mapConstants.MAPLOADER_STRING.LEVEL + ':' + this.mapNameSave);
                }
                this._isFinish1 = true;
            });
        }

        fs.exists(filePath, function (e: boolean) {
            if (!e) {
                fs.mkdir(filePath, function (err: Error) {
                    if (err) {
                        console.log(mapConstants.MAPLOADER_STRING.CREATE_DIRECTORY + ' ' + mapConstants.MAPLOADER_STRING.FAIL + ' ' + err);
                    } else {
                        console.log(mapConstants.MAPLOADER_STRING.CREATE_DIRECTORY + ' ' + mapConstants.MAPLOADER_STRING.SUCCESS + ' ' + filePath);
                        write();
                    }
                });
            } else {
                write();
            }
        });
    }
    /**
     * 将Vec3类型数据保留小数点后两位并
     * @returns string 
     */
    private _getNumberToFixed2(data: Vec3) {
        return JSON.stringify(`${Number(data.x.toFixed(2))},${Number(data.y.toFixed(2))},${Number(data.z.toFixed(2))}`);
    }

    /**
     * 加载关卡信息
     */
    private _loadMap() {
        const projectPath = window.cce.project as string;
        projectPath.replace("\\", " / ");
        let path = `${projectPath}/` + MAP_PATH + MAP_PREFIX + this.mapNameLoad + '.csv';
        const fs = require('fs');

        fs.readFile(path, 'utf-8', (err: Error, data: any) => {
            if (err) {
                return console.error(mapConstants.MAPLOADER_STRING.FAIL + ' ' + mapConstants.MAPLOADER_STRING.LEVEL + ':' + this.mapNameLoad + 'error:' + err);
            }
            console.warn(mapConstants.MAPLOADER_STRING.SUCCESS + ' ' + mapConstants.MAPLOADER_STRING.LEVEL + ':' + this.mapNameLoad);
            this._setLoadDataToMap(data);
            this._isFinish2 = true;
        })
    }

    /**
     * 加载关卡信息到地图中
     * @param nowData 
     */
    private _setLoadDataToMap(nowData: any) {
        this.node.destroyAllChildren();
        const ndMapItem = director.getScene()?.getChildByName('mapItem')!;

        let dataList = nowData.split('\n');
        dataList = this._deleteUselessData(dataList);

        let i = 3; //   0/1/2行 为数据定义
        while (dataList[i]) {
            //举例：dataList[i] = "1,roadStraight3,"0.00,0.00,1.15","1.00,1.00,1.00",",0"
            let itemData = dataList[i].split('"');
            //举例：itemData =   ["1,roadStraight3,", "0.00,0.00,1.15", ",", "1.00,1.00,1.00", ",", ",0"]
            itemData = this._deleteUselessData(itemData);
            //举例：itemData = ["1,roadStraight3,", "0.00,0.00,1.15", "1.00,1.00,1.00", ",0"]
            //                 id     name              position        scale             eulY
            const nameList = this._deleteUselessData(itemData[0].split(','));
            //举例：nameList = ["1", "roadStraight3"]
            //                 id     name   

            const eulY = Number(itemData[3].split(',')[1]);
            //itemData[3] = ",0"

            //由于不支持resources加载， 因此使用复制节点的形式生成道路
            const ndItem = instantiate(ndMapItem.getChildByName(nameList[nameList.length - 1] + '-')) as unknown as Node;
            ndItem.parent = this.node;
            ndItem?.setPosition(gameUtils.setStringToVec3(itemData[1]));
            ndItem?.setScale(gameUtils.setStringToVec3(itemData[2]));
            ndItem?.setRotationFromEuler(new Vec3(0, eulY, 0));

            i++;

            if (nameList[nameList.length - 1] === gameConstants.CSV_MAP_ITEM_NAME.ROAD_END) {
                this._initEndRewardCircle(ndItem);
            }
        }
    }

    /**
     * 清理列表中的无用数据
     * @param list 
     * @returns 
     */
    private _deleteUselessData(list: Array<any>) {
        for (let i = list.length - 1; i > -1; i--) {
            if (list[i].length === 0 || list[i] === ',') {
                //删除  ""  或 "," 的无用数据
                list.splice(i, 1);
            }
        }
        return list;
    }


    /**
     * test  结束的奖励倍数————测试 好直观看
     */
    private _initEndRewardCircle(ndEnd: Node) {
        // return;
        const ndMapItem = director.getScene()?.getChildByName('mapItem')!;

        const addEulRad = ndEnd.eulerAngles.y * macro.RAD; //当前角度朝向
        let startPos = ndEnd.getPosition();
        startPos.subtract3f(
            gameUtils.getDirectionOfDistanceX(gameConstants.REWARD_START_TRANSVERSE, addEulRad),
            0,
            gameUtils.getDirectionOfDistanceZ(gameConstants.REWARD_START_TRANSVERSE, addEulRad),
        )

        let pos = new Vec3();
        let eul = ndEnd.eulerAngles.clone();

        let interval = gameConstants.REWARD_SIZE + 0;

        const getRandomLongitudinal = () => { //纵向随机值——仅允许终点往后 因此随机值只存在正数
            return interval + gameUtils.getRandomRange(gameConstants.REWARD_LONGITUDINAL_RANGE_HALF);
        }
        const getRandomTransverse = () => {//横向随机值——存在左右区间的可能性 所以 随机值允许正负类型数值
            return gameUtils.getRandomRange(gameConstants.REWARD_TRANSVERSE_RANGE_HALF, true);
        }
        for (let i = 0; i < gameConstants.REWARD_CIRCLR_COUNT; i++) {
            const ndEndCircle = instantiate(ndMapItem.getChildByName(gameConstants.CSV_MAP_ITEM_NAME.ROAD_END_REWARD + '-')!) as unknown as Node;
            this.node.addChild(ndEndCircle);

            if (i + 1 > 9) {
                let nowPos = new Vec3();
                nowPos.set(-0.37, 0.01, 0);
                ndEndCircle.children[1].setPosition(nowPos); //第一个子节点为乘号

                const ndNum = ndEndCircle.children[2]; //第二个子节点为数字 10以上的十位数位数
                ndNum.getComponent(MeshRenderer)!.setMaterial(this.matNumList[1], 0);
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
                interval += gameConstants.REWARD_LAST_SCALE_NUM / 2;
            }
            let randomX = gameUtils.getDirectionOfDistanceX(getRandomLongitudinal(), addEulRad);
            let randomZ = gameUtils.getDirectionOfDistanceZ(getRandomLongitudinal(), addEulRad);

            startPos.x -= randomX;
            startPos.z -= randomZ;

            pos.set(startPos);

            if (i === gameConstants.REWARD_CIRCLR_COUNT - 1) {
                //最后一个特殊处理
                ndEndCircle.setPosition(pos);
                ndEndCircle.setRotationFromEuler(eul);
                const endScaleNum = gameConstants.REWARD_LAST_SCALE_NUM;
                const nowScale = ndEndCircle.getScale();
                nowScale.x = endScaleNum;
                nowScale.z = endScaleNum;
                ndEndCircle.setScale(nowScale);
            } else {
                //左右随机一定距离
                const nextEulRad = (ndEnd.eulerAngles.y + 90) * macro.RAD;
                let offsetTransverseX = gameUtils.getDirectionOfDistanceX(getRandomTransverse(), nextEulRad)
                let offsetTransverseZ = gameUtils.getDirectionOfDistanceZ(getRandomTransverse(), nextEulRad)

                pos.add3f(offsetTransverseX, 0, offsetTransverseZ);
                ndEndCircle.setPosition(pos);
                ndEndCircle.setRotationFromEuler(eul);
            }
        }
    }
}