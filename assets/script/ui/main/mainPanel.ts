
import { _decorator, Component, Node, Label, Vec3, ProgressBar, SpriteFrame, Sprite, game, PhysicsSystem } from 'cc';
import { AudioManager } from '../../framework/audioManager';
import { clientEvent } from '../../framework/clientEvent';
import { playerData } from '../../framework/playerData';
import { uiManager } from '../../framework/uiManager';
import { gameConstants } from '../../game/utils/gameConstants';
const { ccclass, property } = _decorator;

const ICON_LIST = {
    VIDEO: 0,
    DIAMOND: 1,
}

@ccclass('MainPanel')
export class MainPanel extends Component {
    @property(Label)
    lbDiamond: Label = null!; //左上角 当前拥有钻石总数

    @property(Node)
    ndDiamodList: Array<Node> = []; //钻石按钮显示

    @property(Node)
    ndBrickList: Array<Node> = []; //砖块按钮显示

    @property(ProgressBar)
    pbLevel: ProgressBar = null!; //关卡进度条

    @property(Node)
    ndLevelNodeList: Array<Node> = []; //等级图片节点

    @property(Label)
    lbLevelList: Array<Label> = []; //等级数字节点

    @property(SpriteFrame)
    sfIconList: Array<SpriteFrame> = [];

    show() {
        this._updateDiamond();
        this._updateLevel();
        this._updateDiamondBtn();
        this._updateBrickBtn();
    }

    /**
     * 判断当前钻石数是否够升级
     */
    private _checkVideo(costNum: number) {
        if (costNum > playerData.instance.playerInfo['diamond']) {
            return true;
        }
        return false;
    }

    /**
     * 更新砖块显示
     */
    private _updateBrickBtn() {
        const nowNum = this._getNowBrick();
        const isVideo = this._checkVideo(nowNum);
        if (isVideo) {
            this.ndBrickList[0].getComponent(Sprite)!.spriteFrame = this.sfIconList[ICON_LIST.VIDEO];
            this.ndBrickList[1].getComponent(Label)!.string = gameConstants.LANGUAGE_LIST.VIDEO;
        } else {
            this.ndBrickList[0].getComponent(Sprite)!.spriteFrame = this.sfIconList[ICON_LIST.DIAMOND];
            this.ndBrickList[1].getComponent(Label)!.string = nowNum.toString();
        }
    }

    /**
     * 更新钻石显示
     */
    private _updateDiamondBtn() {
        const nowNum = this._getNowDiamond();
        const isVideo = this._checkVideo(nowNum);
        if (isVideo) {
            this.ndDiamodList[0].getComponent(Sprite)!.spriteFrame = this.sfIconList[ICON_LIST.VIDEO];
            this.ndDiamodList[1].getComponent(Label)!.string = gameConstants.LANGUAGE_LIST.VIDEO;
        } else {
            this.ndDiamodList[0].getComponent(Sprite)!.spriteFrame = this.sfIconList[ICON_LIST.DIAMOND];
            this.ndDiamodList[1].getComponent(Label)!.string = nowNum.toString();
        }
    }

    /**
     * 更新关卡等级
     */
    private _updateLevel() {
        const levelNum = Number(playerData.instance.playerInfo['level']);
        if (levelNum === Number(this.lbLevelList[2].string)) return;

        this.pbLevel.node.setScale(1, 1, 1);
        for (let i = 0; i < this.ndLevelNodeList.length; i++) {
            this.ndLevelNodeList[i].active = true;
        }
        for (let i = 0; i < this.lbLevelList.length; i++) {
            this.lbLevelList[i].node.active = true;
        }

        if (levelNum === 1) {
            this.pbLevel.progress = 0;
            this.pbLevel.node.setPosition(new Vec3(96, 0, 0));
            this.pbLevel.node.setScale(0.6, 1, 1);

            this.lbLevelList[0].node.active = false;
            this.lbLevelList[1].node.active = false;

            this.ndLevelNodeList[0].active = false;
            this.ndLevelNodeList[1].active = false;
        } else if (levelNum === 2) {
            this.pbLevel.progress = 0.3;
            this.pbLevel.node.setPosition(new Vec3(50, 0, 0));

            this.ndLevelNodeList[0].active = false;

            this.lbLevelList[0].node.active = false;

            this.lbLevelList[1].string = (levelNum - 1).toString();
        } else {
            this.pbLevel.progress = 0.5;
            this.pbLevel.node.setPosition(new Vec3(0, 0, 0));

            this.lbLevelList[1].string = (levelNum - 1).toString();
            this.lbLevelList[0].string = (levelNum - 2).toString();
        }

        this.lbLevelList[2].string = levelNum.toString();
        this.lbLevelList[3].string = (levelNum + 1).toString();
        this.lbLevelList[4].string = (levelNum + 2).toString();
    }

    /**
     * 更新钻石
     */
    private _updateDiamond() {
        const diaMondNum = playerData.instance.playerInfo['diamond'];
        this.lbDiamond.string = (diaMondNum).toString();
    }

    /**
     * 开始游戏按钮
     */
    public onBtnStartClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        uiManager.instance.showDialog(gameConstants.PANEL_PATH.GAME_PANEL, [true]);
        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.MAIN_PANEL);
    }

    /**
     * 设置按钮
     */
    public onBtnSettingClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        uiManager.instance.showDialog(gameConstants.PANEL_PATH.SETTING_PANEL);
        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.MAIN_PANEL);
    }

    /**
     * 商店按钮
     */
    public onBtnShopClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        // uiManager.instance.showDialog('shop/shopPanel');
        // uiManager.instance.hideDialog(gameConstants.PANEL_PATH.MAIN_PANEL);
        uiManager.instance.showDialog(gameConstants.PANEL_PATH.TIPS_PANEL, [gameConstants.LANGUAGE_LIST.COMMING_SOON, ''])
    }

    /**
     * 砖块添加按钮
     */
    public onBtnAddBrickClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        if (this._checkVideo(this._getNowBrick())) { //视频观看
            uiManager.instance.showDialog(gameConstants.PANEL_PATH.TIPS_PANEL, [gameConstants.LANGUAGE_LIST.DIAMOND_NOT_ENOUGH])
        } else {
            clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.ADDROLEBRICK, 1, true);

            playerData.instance.updatePlayerInfo('diamond', -this._getNowBrick());
            playerData.instance.updatePlayerInfo('mainBrickAdd', 1);
            playerData.instance.savePlayerInfoToLocalCache();

            this._updateDiamondBtn();
            this._updateBrickBtn();
            this._updateDiamond();
        }
    }

    /**
     * 钻石添加按钮
     */
    public onBtnAddDiamondClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        if (this._checkVideo(this._getNowDiamond())) { //视频观看
            uiManager.instance.showDialog(gameConstants.PANEL_PATH.TIPS_PANEL, [gameConstants.LANGUAGE_LIST.DIAMOND_NOT_ENOUGH])
        } else {
            playerData.instance.updatePlayerInfo('diamond', -this._getNowDiamond());
            playerData.instance.updatePlayerInfo('mainDiamondMul', 1);
            playerData.instance.savePlayerInfoToLocalCache();

            this._updateDiamondBtn();
            this._updateBrickBtn();
            this._updateDiamond();
        }
    }

    /**
     * 获取当前砖块等级价格
     */
    private _getNowBrick() {
        return Math.round(gameConstants.MAIN_BASIS_BRICK * Math.pow(gameConstants.MAIN_MUL, playerData.instance.playerInfo['mainBrickAdd']));
    }

    /**
     * 获取当前钻石 等级价格
     */
    private _getNowDiamond() {
        return Math.round(gameConstants.MAIN_BASIS_BRICK * Math.pow(gameConstants.MAIN_MUL, playerData.instance.playerInfo['mainDiamondMul']));
    }
}