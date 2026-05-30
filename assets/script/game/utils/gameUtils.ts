import { bezier, macro, Vec2, Vec3 } from "cc";
import { gameConstants } from "./gameConstants";
export class gameUtils {
    /**
     * 计算当前x/z对应的砖块所在区间
     */
    public static checkNowBrickIndex(posX: number, posZ: number) {
        return Math.abs(Math.floor(posX / gameConstants.BRICK_CAN_GET_INTERVAL)) + '/' + Math.abs(Math.floor(posZ / gameConstants.BRICK_CAN_GET_INTERVAL));
    }

    /**
     * 计算两个节点的xz坐标的弧度
     * @param x1 
     * @param z1 
     * @param x2 
     * @param z2 
     * @returns 
     */
    public static checkTwoPosEulRad(x1: number, z1: number, x2: number, z2: number) {
        return Math.atan2(x1 - x2, z1 - z2);
    }

    /**
     * 获取两个坐标在xz轴的距离
     * @param x1 
     * @param z1 
     * @param x2 
     * @param z2 
     * @returns 
     */
    public static getTwoPosXZLength(x1: number, z1: number, x2: number, z2: number) {
        const x = x1 - x2;
        const z = z1 - z2;
        return Math.sqrt(x * x + z * z);
    }

    /**
     * 将当前的string型 转化为vec3类型数据
     * @param dataString string
     * @returns Vec3
     */
    public static setStringToVec3(dataString: string) {
        const data = dataString.split(',');
        return new Vec3(Number(data[0]), Number(data[1]), Number(data[2]));
    }

    /**
     * 获取给定范围内随机值
     * @param num 0-n的n的具体数值
     * @param isIncludeMinus 是否包含负数
     * @returns 
     */
    public static getRandomRange(num: number, isIncludeMinus?: boolean) {
        if (isIncludeMinus) {
            return (Math.random() > 0.5 ? 1 : -1) * Math.random() * num;
        }
        return Math.random() * num;
    }

    /**
     * 获取角色的偏移
     */
    public static getRandomAiOffset() {
        return this.getRandomRange(gameConstants.AI_OFFSET_MAX, true)
    }

    /**
    * 贝塞尔计算公式
    * @param t 
    * @param bezierList 当前计算数组
    * @returns 计算后数值
    */
    public static getBezier(t: number, bezierList: Array<number>) {
        if (bezierList.length === 2) {//直路
            return (1 - t) * bezierList[0] + t * bezierList[1];
        } else if (bezierList.length === 3) {//弯路
            return (1 - t) * (1 - t) * bezierList[0] + 2 * t * (1 - t) * bezierList[1] + t * t * bezierList[2];
        } else {
            //其余暂时用不到 不处理
            console.error('未补充' + bezierList.length + '次方公式');
            return 0;
        }
    }
    /**
     * 计算当前存储的配置计算出贝塞尔曲线
     * @param mapBezierData 
     * @param initOffset 
     * @param cb 
     */
    public static getBezierCalculateList(mapBezierData: any, initOffset: number, aidata: any, cb: any) {
        let bezierList = []; //当前经过贝塞尔计算之后的所有坐标
        let t = 0;
        let nowData;
        let nowPos: { x: number, z: number } = null!;
        let nextData;
        let nextPos: { x: number, z: number } = { x: 0, z: 0 };
        let xList = [] as Array<number>;
        let zList = [] as Array<number>;;
        let nowId = 1;

        const pushPosToList = (pos: { x: number, z: number }) => {
            xList.push(pos.x);
            zList.push(pos.z);
        }

        let offset = initOffset;

        if (aidata) {
            nowId = 0; //如果存在角色坐标 就从0开始
            mapBezierData[0] = aidata;
        }

        while (nowId !== 999) { //id===999 当前路径结束
            xList.length = 0;
            zList.length = 0;
            nowData = mapBezierData[nowId];
            let nextIdListNum = 0;
            if (nowData.nextIdList.length > 1) {
                nextIdListNum = Math.floor(Math.random() * nowData.nextIdList.length)
            }
            nextData = mapBezierData[nowData.nextIdList[nextIdListNum]];

            if (!nowPos) { //不存在 当前坐标 初始化
                if (nowId === 0) {
                    nowPos = { x: nowData.pos.x, z: nowData.pos.z };
                    const addX = offset * Math.sin((nextData.eulY + 90) * macro.RAD);
                    const addZ = offset * Math.cos((nextData.eulY + 90) * macro.RAD);
                    nextPos = { x: nextData.pos.x + addX, z: nextData.pos.z + addZ };
                } else {
                    const addX = offset * Math.sin((nowData.eulY + 90) * macro.RAD);
                    const addZ = offset * Math.cos((nowData.eulY + 90) * macro.RAD);
                    nowPos = { x: nowData.pos.x + addX, z: nowData.pos.z + addZ }
                    nextPos = { x: nextData.pos.x + addX, z: nextData.pos.z + addZ };
                }

                pushPosToList(nowPos);
            } else {
                pushPosToList(nowPos);

                if (nextData.isBendEnd) { //当前是弯道的情况 重置偏移量 并计算偏移下一次的坐标
                    offset = gameUtils.getRandomRange(0.4, true);
                    const addX = offset * Math.sin((nextData.eulY + 90) * macro.RAD);
                    const addZ = offset * Math.cos((nextData.eulY + 90) * macro.RAD);

                    nextPos = { x: nextData.pos.x + addX, z: nextData.pos.z + addZ };

                    //当前是弯道 算出来的当前三个点确定的曲线贝塞尔
                    if (nowData.eulY - nextData.eulY < 0) {
                        pushPosToList({ x: nowPos.x, z: nextPos.z });
                    } else {
                        pushPosToList({ x: nextPos.x, z: nowPos.z });
                    }
                } else {
                    nextPos = nextData.pos;
                    let nowInitPos = nowData.pos;
                    //直路 朝着正前方行走
                    const rad = gameUtils.checkTwoPosEulRad(nowInitPos.x, nowInitPos.z, nextPos.x, nextPos.z);
                    const posLength = Math.sqrt((nowInitPos.x - nextPos.x) * (nowInitPos.x - nextPos.x)
                        + (nowInitPos.z - nextPos.z) * (nowInitPos.z - nextPos.z));
                    nextPos = { x: nowPos.x - Math.sin(rad) * posLength, z: nowPos.z - Math.cos(rad) * posLength };
                }
            }
            pushPosToList(nextPos);

            let subPos = gameUtils.getTwoPosXZLength(nowPos.x, nowPos.z, nextPos.x, nextPos.z);
            let countNum = Math.round(subPos / gameConstants.AIWAY_TWO_POINT_RANGE);

            for (let k = 0; k < countNum; k++) {
                let pos = new Vec2(0, 0); //x值对应pos.x z值对应pos.y 节省多余的y的数据 
                t = k / countNum;

                pos.x = Number((gameUtils.getBezier(t, xList).toFixed(3)));
                pos.y = Number((gameUtils.getBezier(t, zList).toFixed(3)));

                bezierList.push(pos);
            }
            //当前id 设置为下一次的id————id衔接
            nowId = nowData.nextIdList[nextIdListNum];
            //当前坐标 设置为下一次的坐标————坐标衔接
            nowPos = nextPos;

            if (nowId === 999) {//结束的时候 将最后一个结束点放入数组
                bezierList.push(new Vec2(Number((nowPos.x.toFixed(3))), Number((nowPos.z.toFixed(3)))));
                cb(bezierList);
            }
        }
    }

    /**
     * 将当前ai的信息归整 方便放入配置好的贝塞尔关卡路径 
     * @param pos 
     * @returns 
     */
    public static getAiDataToBezierList(pos: Vec3) {
        return { nextIdList: '1', pos, eulY: 0, isBendEnd: false };
    }

    /**
     * 获取当前玩家和ai的分组
     * @returns 
     */
    public static getAiAndPlayerGroup() {
        return gameConstants.COLLIDER_GROUP_LIST.PLAYER + gameConstants.COLLIDER_GROUP_LIST.AI;
    }

    /**
     * 获得一定角度一定距离的坐标X
     * @param distance 
     * @param eulRad 
     * @returns 
     */
    public static getDirectionOfDistanceX(distance: number, eulRad: number) {
        return distance * Math.sin(eulRad);
    }

    /**
     * 获得一定角度一定距离的坐标Z
     * @param distance 
     * @param eulRad 
     * @returns 
     */
    public static getDirectionOfDistanceZ(distance: number, eulRad: number) {
        return distance * Math.cos(eulRad);
    }

    /**
    * 结尾倍数地面对应音效数字
    * @param mulNum
    * @returns 
    */
    public static getRewardMulToMusicNum(mulNum: number) {
        if (mulNum >= 2 && mulNum <= 4) {
            return 1;
        } else if (mulNum >= 5 && mulNum <= 7) {
            return 2;
        } else if (mulNum >= 8 && mulNum <= 14) {
            return 3;
        } else if (mulNum === 15) {
            return 4;
        }
        return 0; //不存在
    }

    /**
     * 当前音效随机值
     * @returns 
     */
    public static getMusicNum(count: number) {
        return Math.ceil(Math.random() * count);
    }
}