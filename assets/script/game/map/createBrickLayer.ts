
import { _decorator, Component, Node, CCString, CCBoolean, macro, Vec3, instantiate, Prefab } from 'cc';
import { gameConstants } from '../utils/gameConstants';
import { gameUtils } from '../utils/gameUtils';
const { ccclass, property } = _decorator;
/*
本脚本用于生成 module.csv中未包含的 新砖块堆样式 供策划添加新砖块堆使用；
若想新增一种砖块样式：
1.module.csv中同步添加信息
    编号(ID)在 2000-2999之间
    类型(type)为 brickLayer
    资源名称(name)为 layer100   (100为替换数字 )
    砖块堆数据(brickLayerData)为 当前编辑期内输入的砖块堆数据
2.将当前砖块堆修改命名(与编号ID保持一致)后放入map场景的mapItemn中，点击mapNode节点脚本的——修改mapItem子节点命名 
（否则在map场景中想要生成关卡地图时，将查找不到新的砖块堆）
 */
const VEC3_NONE = new Vec3(0, 0, 0);

@ccclass('CreateBrickLayer')
export class CreateBrickLayer extends Component {
    @property({ type: Prefab, displayName: '砖块预制体' })
    brickPre: Prefab = null!;
    @property({   displayName: ' ' })
    test1: string = '导出砖块堆';
    @property({   displayName: ' ' })
    test2: string = '导出砖块数据示例：8/7。 代表以靠近地面开始往上算层数，第一层8个砖块，第二层7个砖块';
    @property({   min: 1, step: 1, displayName: '砖块堆数据' })
    brickLayerString: string = '8/7';

    _isFinish1 = true;
    @property({   displayName: '生成砖块堆' })
    get createBrickLayer() {
        return !this._isFinish1;
    }
    set createBrickLayer(v) {
        if (!this._isFinish1) {
            return;
        }
        console.log("开始计算");
        this._isFinish1 = false;

        this._creatrBrickLayer();
    }

    /**
     * 生成对应砖块堆
     */
    private _creatrBrickLayer() {
        this.node.destroyAllChildren();
        let brickLayerData = this.brickLayerString.split('/');

        const brickParent = new Node('brickParent');
        brickParent.parent = this.node;
        brickParent.setPosition(VEC3_NONE);

        for (let j = 0; j < brickLayerData.length; j++) {
            const nowEul = VEC3_NONE;
            const nowPos = VEC3_NONE;
            let nowMul = 0; //当前的坐标倍数
            //正前方的xz坐标
            let eulRad = nowEul.y * macro.RAD;
            const addX1 = gameUtils.getDirectionOfDistanceX(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);
            const addZ1 = gameUtils.getDirectionOfDistanceZ(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);
            //正后方的xz坐标
            eulRad = (180 + nowEul.y) * macro.RAD;
            const addX2 = gameUtils.getDirectionOfDistanceX(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);
            const addZ2 = gameUtils.getDirectionOfDistanceZ(gameConstants.BRICK_LAYER_ONCE_Z, eulRad);

            const nowCount = Number(brickLayerData[j]);
            let brickCount = 0; //当前生成砖块数量
            let nowY = j * gameConstants.BRICK_LAYER_ONCE_Y;
            if (nowCount % 2 === 0) { //偶数
                nowMul = 0.5;
            } else { //奇数
                //创建一个当前位置的砖块
                this._loadBrick(brickParent, nowPos.clone().add3f(0, nowY, 0), nowEul);

                brickCount++;
                nowMul = 1;
            }
            while (brickCount < nowCount) {
                //每次生成两个+-对称的砖块
                this._loadBrick(brickParent, nowPos.clone().add3f(addX1 * nowMul, nowY, addZ1 * nowMul), nowEul);
                this._loadBrick(brickParent, nowPos.clone().add3f(addX2 * nowMul, nowY, addZ2 * nowMul), nowEul);

                nowMul += 1;
                brickCount += 2;
                continue;
            }
        }
        this._isFinish1 = true;
    }

    /**
    * 加载砖块
    * @param parent
    * @param pos 
    * @param eul 
    */
    private _loadBrick(parent: Node, pos: Vec3, eul: Vec3) {
        const ndNowBrick = instantiate(this.brickPre) as Node;
        ndNowBrick.parent = parent;
        ndNowBrick.setPosition(pos);
        ndNowBrick.setRotationFromEuler(eul);
        const brickSize = gameConstants.BRICK_ONCE_SIZE_DOWN_INIT;
        ndNowBrick.setScale(new Vec3(brickSize, brickSize, brickSize));
    }
}