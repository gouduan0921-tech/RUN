
import { _decorator, Component, CCString, CCBoolean } from 'cc';
import { mapConstants } from './mapConstants';
const { ccclass, property } = _decorator;
/*
1.Number(this.node.name)为 >=0 <=999 的数字    999代表结束点
2.nextIdList:Array<number> 下一个目标点的名称 
    下一目标点为空的自动补齐规则（从上到下优先级）：
        1.将自身的 Number(name)+1 
        2.如果不存在Number(name)+1 则下一个认定为终点999
3.isBendEnd 弯道结束标志（贝塞尔的弯道 需要手动计算入弯出弯之间的一个点 控制弯道）
*/
@ccclass('AiWayItem')
export class AiWayItem extends Component {
    @property({   displayName: ' ' })
    test1: string = mapConstants.AIWAYITEM_STRING.TEXT1;
    @property({   displayName: ' ' })
    test2: string = mapConstants.AIWAYITEM_STRING.TEXT2;
    @property({   displayName: ' ' })
    test3: string = mapConstants.AIWAYITEM_STRING.TEXT3;
    @property({   displayName: ' ' })
    test4: string = mapConstants.AIWAYITEM_STRING.TEXT4;
    @property({ displayName: mapConstants.AIWAYITEM_STRING.NEXT_NAME })
    nextIdString: string = '';  //可走道路 '2,3,4'
    @property({   displayName: mapConstants.AIWAYITEM_STRING.ISBENDEND })
    isBendEnd: boolean = false; //是否是弯道结束
}