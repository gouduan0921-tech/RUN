
import { _decorator, Component, Node, UIOpacity, Label } from 'cc';
const { ccclass, property } = _decorator;

const POS_Y_START = 200;
const POS_Y_END = 400;
const POS_Y_CHANGE_NUM = 11.7;

const OPACITY_CHANGE_NUM = 15;
//TODO:大小缩放还没做
// const SCALE_INIT = 2;
// const SCALE_MAX = 3;

// const TIME_SHOW_SCALE_CHANGE = 0.6; //显示放大效果 
const TIME_SHOW_BRICK = 1; //显示拾取砖块数(秒)

@ccclass('AddBrickTips')
export class AddBrickTips extends Component {
    private _opacity: UIOpacity = null!; //透明度调整组件
    private _lb: Label = null!;
    private _addBrickNum: number = 0; //当前添加的转快数量
    private _addBrickCheckTime: number = 0; //当前添加砖块数字显示时间
    private _isHideAni: boolean = false;
    // private _checkScale:boolean = false;

    onLoad() {
        this._opacity = this.node.getComponent(UIOpacity)!;
        this._lb = this.node.getComponent(Label)!;
    }

    /**
     * 添加砖块 数字展示
     */
    addBrickTipsAni() {
        if (this._isHideAni || !this.node.active) {
            //当前未显示 或正在淡出不继续叠加计算状态
            this._isHideAni = false;
            this._opacity.opacity = 255;

            this.node.active = true;
            this.node.setPosition(0, POS_Y_START, 0);

            this._addBrickCheckTime = 0;
            this._addBrickNum = 0;    
        }
        this._addBrickNum++;
        this._lb.string =  '+' + this._addBrickNum.toString();
    }

    update(dt: number) {
        if (this._addBrickCheckTime < TIME_SHOW_BRICK) {
            //TIME_SHOW_BRICK 内皆可继续累积当前获取砖块
            this._addBrickCheckTime += dt;
        } else {
            this._isHideAni = true;
            //不可继续累积砖块 向上移动变透明
            const pos = this.node.getPosition();
            if (pos.y > POS_Y_END) {
                this.node.active = false;
                return;
            }
            this.node.setPosition(pos.add3f(0, POS_Y_CHANGE_NUM, 0));
            this._opacity.opacity = Number(this._opacity.opacity) - OPACITY_CHANGE_NUM;
        }
    }
}