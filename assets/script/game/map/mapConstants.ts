const mapConstants = {
    COMMON: {
        START_CALCULATE: '开始计算',
    },
    MAPLOADER_STRING: {
        SAVE_MAP_DATA: '导出关卡——关卡分栏',
        SAVE_MAP_NUM: '导出关卡数',
        SAVE_MAP_CHECK: '保存关卡数据',

        LOAD_MAP_DATA: '加载关卡——关卡分栏',
        LOAD_MAP_NUM: '加载关卡数',
        LOAD_MAP_CHECK: '加载关卡数据',


        AMEND_MAPITEM_NAME1: '归整mapItem子节点命名',
        AMEND_MAPITEM_NAME2: '修改mapItem子节点命名',

        SUCCESS: '成功',
        FAIL: '失败',
        LEVEL: '关卡',

        CREATE_DIRECTORY: '创建目录',
    },

    AIWAY_STRING: {
        SAVE_BEZIER_DATA: '导出配置的贝塞尔数据——分栏',
        SAVE_BEZIER_NUM: '导出关卡数',
        SAVE_BEZIER_CHECK: '导出配置数据',

        LOAD_BEZIER_DATA: '加载配置的贝塞尔数据——分栏',
        LOAD_BEZIER_NUM: '加载关卡数',
        LOAD_BEZIER_CHECK: '加载配置数据',

        SHOW_WAY: '是否显示路径',

        SHOW_WAY_DATA: '显示贝塞尔路径(间隔越大显示的点越少,避免节点太多卡顿)',
    },

    AIWAYITEM_STRING: {
        TEXT1: '下一个目标节点',
        TEXT2: '放空代表不存在，将自动存入本身的节点名称+1',
        TEXT3: '下一个节点不存在，将自动存入999(999代表结束点)',
        TEXT4: '示例(多个用英文逗号隔开)：  2,3   下一个目标节点为2和3任选其中之一',
        NEXT_NAME: '下一个目标点的名称',
        ISBENDEND: '当前节点是否为弯道结束',
    },
}
export { mapConstants }