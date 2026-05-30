
import { _decorator, Component, Node, director } from 'cc';
import { AudioManager } from '../../framework/audioManager';
import { clientEvent } from '../../framework/clientEvent';
import { uiManager } from '../../framework/uiManager';
import { gameConstants } from '../../game/utils/gameConstants';
const { ccclass, property } = _decorator;

@ccclass('ClosePanel')
export class ClosePanel extends Component {
    show() { }

    /**
     * 确定按钮
     */
    public onBtnDetermineClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.CLOSEPANEL);
        uiManager.instance.showDialog(gameConstants.PANEL_PATH.MAIN_PANEL);

        //重新开始游戏
        clientEvent.dispatchEvent(gameConstants.CLIENTEVENT_LIST.RESTARTGAME);

        director.resume();
    }

    /**
     * 取消按钮
     */
    public onBtnCancelClick() {
        AudioManager.instance.playSound(gameConstants.MUSIC_LIST.CLICK);

        uiManager.instance.hideDialog(gameConstants.PANEL_PATH.CLOSEPANEL);
        uiManager.instance.showDialog(gameConstants.PANEL_PATH.GAME_PANEL);

        director.resume();
    }
}