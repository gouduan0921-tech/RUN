import { _decorator, Component, Node, LabelComponent, Vec3, tween, UIOpacityComponent, isValid, SpriteFrame, SpriteComponent, UITransform, Color } from 'cc';
import { poolManager } from './../../framework/poolManager';
import { util } from './../../framework/util';
// import { GameManager } from '../fight/gameManager';
const { ccclass, property } = _decorator;

@ccclass('tips')
export class tips extends Component {
    /* class member could be defined like this */
    // dummy = '';

    /* use `property` decorator if your want the member to be serializable */
    // @property
    // serializableDummy = 0;

    @property(LabelComponent)
    public lbTips: LabelComponent = null!;

    @property(SpriteComponent)
    public spIcon: SpriteComponent = null!;

    @property(SpriteComponent)
    public spBg: SpriteComponent = null!;

    @property(UIOpacityComponent)
    public UIOpacityBg: UIOpacityComponent = null!;

    @property(SpriteFrame)
    public sfGold: SpriteFrame = null!;

    @property(SpriteFrame)
    public sfHeart: SpriteFrame = null!;

    private _targetPos: any;
    private _isShow: boolean = false;
    private _movePos: Vec3 = new Vec3();
    private _curTipPos = new Vec3();
    private _tipTotalHeight = 0;
    private _tipSpeedAddTimes = 0
    private _type: string = '';

    public show (content: string, type: string, targetPos: Vec3, scale: number, callback: Function = () => { }) {
        if (!scale) {
            scale = 1;
        }
        if (!targetPos) {
            targetPos = new Vec3(0, 0, 0)
        }

        this._type = type;

        this.node.setScale(new Vec3(scale, scale, scale));

        let size = this.lbTips?.node?.getComponent(UITransform)?.contentSize;
        if (!isValid(size)) {//size不存在，自我销毁
            poolManager.instance.putNode(this.node);
            return;
        }

        this.lbTips.string = content;
        this.lbTips.color = new Color(214, 132, 53, 255);

        if (type === 'gold' || type === 'heart') {
            this.spBg.enabled = false;
            this._movePos = new Vec3();
            this._curTipPos = new Vec3()
            this._tipSpeedAddTimes = 0;
            this._tipTotalHeight = 0;
            this._isShow = true;
            this._targetPos = targetPos;
            this.UIOpacityBg.opacity = 50;

            if (type === 'gold') {
                this.spIcon.spriteFrame = this.sfGold;
            } else if (type === 'heart') {
                this.spIcon.spriteFrame = this.sfHeart;
            }

            this.lbTips.color = new Color(255, 255, 255, 255);
            this.lbTips.string = util.formatValue(Number(content));

            tween(this.node)
                .to(1.2, { scale: new Vec3(scale, scale, scale) }, { easing: 'smooth' })
                .start();

            tween(this.UIOpacityBg)
                .to(0.8, { opacity: 255 }, { easing: 'smooth' })
                .to(0.4, { opacity: 0 }, { easing: 'smooth' })
                .call(() => {
                    this._isShow = false;
                    callback && callback();
                    poolManager.instance.putNode(this.node);
                })
                .start();
        } else {
            //纯文字提示
            this.spBg.enabled = true;
            this.UIOpacityBg.opacity = 255;
            this.node.setPosition(targetPos);

            this.spIcon.node.active = false;

            this.scheduleOnce(() => {
                tween(this.node)
                    .to(1.1, { position: new Vec3(0, 230, 0) }, { easing: 'smooth' })
                    .call(() => {
                        callback && callback();
                        poolManager.instance.putNode(this.node);
                    })
                    .start();

                tween(this.UIOpacityBg)
                    .to(0.7, { opacity: 220 }, { easing: 'smooth' })
                    .to(0.4, { opacity: 0 }, { easing: 'smooth' })
                    .call(() => {

                    })
                    .start();
            }, 0.8);
        }
    }

    // update (deltaTime: number) {
    // Your update function goes here.

    // if ((this.type === 'gold' || this.type === 'heart') && this.isShow && this.tipTotalHeight <= 70) {
    //     GameManager.mainCamera.convertToUINode(this.targetPos, find('Canvas') as Node, this.movePos);
    //     this.tipSpeedAddTimes += deltaTime * 10;
    //     let ratio = 0.020 - this.tipSpeedAddTimes * 0.01;
    //     ratio = ratio <= 0.01 ? 0.01 : ratio 
    //     let tipSpeed = Math.pow(this.tipSpeedAddTimes, 3) * ratio;
    //     this.tipTotalHeight += tipSpeed;

    //     this.curTipPos.add3f(0, tipSpeed,0);
    //     this.movePos.add(this.curTipPos);
    //     this.node.setPosition(this.movePos);
    // }
    // }
}
