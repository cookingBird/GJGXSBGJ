<template>
<div class="level-wrapper">
  <div class="level-top shadow-content bg-fff"></div>
  <div class="level-content">
    <div class="level-content-left shadow-content bg-fff">
      <el-scrollbar>
        <pipe-selector
          :data="pipeList"
          :defaultOpen="true"
          :defaultSelect="pipeList[0].children[0]?.id"
          :optionsKey="{ title: 'pipeName', key: 'id', children: 'children' }"
          @select="handlePipeSelect"
        ></pipe-selector>
      </el-scrollbar>
    </div>
    <div class="level-content-right">
      <div class="right-content">
        <mix-table
          ref="table"
          :tableColumns="tableColumns"
          :config="tableConfig"
          @onData="onTableGetData"
          @row-click="handleTableRowClick"
          reqMethods="GET"
          url="/highconsarea/nextOperate"
          :isPagination="false"
          :query="{ taskId:taskId,nodeId: 2,flag: '',pipeCode: pipeCode}"
          :pageParams="{pageNo:1,pageSize:-1}"
        >
          <div class="absolute map-layer-switcher-group">
            <LayerSwitcher
              v-model="populationShow"
              :number="pipeAroundTotal.people"
              title="人居"
              @change="onPopulationChange"
            ></LayerSwitcher>
            <LayerSwitcher
              v-model="placeShow"
              :number="pipeAroundTotal.place"
              title="特定场所"
              @change="onPlaceChange"
            ></LayerSwitcher>
          </div>
        </mix-table>
      </div>
      <div class="mt-2 right-footer shadow-content">
        <el-button
          type="primary"
          @click="onPrev"
        >上一步</el-button>
        <el-button
          type="primary"
          @click="handleDiscern"
        >一键识别</el-button>
        <el-button
          type="primary"
          @click="handleNext"
        >下一步</el-button>

      </div>
    </div>
  </div>
  <el-dialog
    @close="onclose"
    v-if="dialogVisible"
    title="修改地区等级"
    :visible.sync="dialogVisible"
    width="25%"
  >
    <div class="flex justify-around">
      <el-button
        v-for="btn in levelGroup"
        :key="btn.level"
        :class="{'selected':(selectRowLevel == btn.level || selectRowLevel == btn.label)}"
        class="el-button-level"
        @click="onSelectLevel(btn)"
      >
        {{ btn.label }}
      </el-button>
    </div>
    <div class="flex justify-center mt-7">
      <el-button
        v-for="aBtn in dialogAction"
        type="primary"
        :key="aBtn.code"
        @click="onDialogAction(aBtn)"
      >
        {{ aBtn.label }}
      </el-button>
    </div>
  </el-dialog>
</div>
</template>

<script>
  import MixTable from '@/components/mixTable';
  import PipeSelector from '@/components/pipeSelector';
  import * as Helper from './Helper'
  import LayerSwitcher from '@/components/LayerSwitcher.vue'
  import { lineAround,pipeAround } from '@/api/analyse';
  const CURRENT_NODE_STEP = 3;

  export default {
    components: {
      MixTable,
      PipeSelector,
      LayerSwitcher
    },
    data () {
      return {
        pipeList: [{
          pipeName: '全部管道',
          id: 1,
          children: []
        }],
        tableConfig: {
          isPagination: false,
          buttons: {
            fixed: 'right',
            list: [
              {
                size: 'normal',
                label: '修改等级',
                click: this.onEdit
              }
            ],
            width: '100px'
          }
        },
        tableColumns: [
          {
            label: "所属管线",
            prop: "pipeSegmentName"
          },
          {
            label: "分段编号",
            prop: "code"
          },
          {
            label: "地区等级",
            prop: "regionLevel",
            format: function (val) {
              if (val == 0) {
                return '-'
              } else if (val == 1) {
                return '一级'
              } else if (val == 2) {
                return '二级'
              } else if (val == 3) {
                return '三级'
              } else if (val == 4) {
                return '四级'
              } else {
                return val
              }
            }
          },
          {
            label: "分段长度（m）",
            prop: "segmentLength"
          },
          {
            label: "起始里程（m）",
            prop: "beginMileage"
          },
          {
            label: "终止里程（m）",
            prop: "endMileage"
          },
          {
            label: "人居（户）",
            prop: "population"
          },
          {
            label: "特定场所（个）",
            prop: "specificProduction",
          },
          {
            label: "易燃易爆场所（个）",
            prop: "flammableExplosivePlace"
          },
        ],
        dialogVisible: false,
        levelGroup: [
          { label: '一级',level: 1 },
          { label: '二级',level: 2 },
          { label: '三级',level: 3 },
          { label: '四级',level: 4 },
        ],
        dialogAction: [
          { label: '取消',code: 'cancel' },
          { label: '确定',code: 'submit' },
        ],
        selectRowLevel: 1,
        pipeCode: '',
        populationShow: true,
        placeShow: true,
        pipeAroundTotal: {
          people: 300,
          place: 200
        }
      }
    },
    computed: {
      taskId () {
        return this.$route.query.id
      },
      taskName () {
        return this.$route.query.taskName
      },
      mapRef () {
        return this.$refs['table'].$refs['basemap'];
      }
    },
    created () {
      this.getSelectedPipeList()
    },
    methods: {
      getSelectedPipeList () {
        Helper.queryAllSelected({
          keyWords: '',
          pageNo: 1,
          pageSize: -1,
          startTime: '',
          endTime: '',
          status: 0,
          taskId: this.taskId
        }).then((data) => {
          this.pipeList[0].children = data.data;
          this.handlePipeSelect(data.data[0])
        })
      },
      /**@description 一键识别 */
      handleDiscern () {
        Helper.discernOneStep({
          taskId: this.taskId,
          nodeId: CURRENT_NODE_STEP
        }).then((res) => {
          this.$router.push({
            path: '/DiscernSteps/discern',
            query: {
              id: this.taskId,
              taskName: this.taskName
            }
          })
        })
      },
      /**@description 下一步 */
      handleNext () {
        Helper.nextStepOpr({
          taskId: this.taskId,
          nodeId: CURRENT_NODE_STEP,
          flag: 'next'
        }).then(() => {
          this.$router.push({
            path: '/DiscernSteps/discern',
            query: {
              id: this.taskId,
              taskName: this.taskName
            }
          })
        })
      },
      onEdit (row) {
        this.dialogVisible = true;
        this.__edittingRow = row;
        this.selectRowLevel = row.regionLevel;
      },
      onclose () {
        this.dialogVisible = false;
        this.__edittingRow = null
      },
      onSelectLevel (btn) {
        this.__selectBtn = btn;
        this.selectRowLevel = btn.level
      },
      onDialogAction (aBtn) {
        const { code,id,pipeSegmentCode } = this.__edittingRow;
        switch (aBtn.code) {
          case 'cancel': {
            this.dialogVisible = false;
            this.__edittingRow = null;
            break;
          }
          case 'submit': {
            const { label,level } = this.__selectBtn;
            Helper.pipeLevelMutation({
              code,
              id,
              levelName: label,
              levelNo: level,
              node: CURRENT_NODE_STEP,
              pipeSegmentCode,
              taskId: this.taskId
            }).then(() => {
              this.$message.success('修改成功');
              this.$refs.table.$refs.table.refresh();
              this.dialogVisible = false;
              this.__edittingRow = null;
            })
            break;
          }
          default: {
            throw Error(`unCapture action type ${aBtn.code}`)
          }
        }
      },
      onPrev () {
        this.$router.push({
          path: '/DiscernSteps/section',
          query: this.$route.query
        })
      },
      handlePipeSelect (pipe) {
        const requestDom = require("@/utils/misc").requestDom;
        this.pipeCode = pipe.pipeSegmentCode;
        requestDom(() => this.$refs['table']?.$refs['table'])
          .then((comp) => {
            comp.refresh({ pipeCode: pipe.pipeSegmentCode })
          })
        const pipeAround = require('@/api/analyse').pipeAround;
        pipeAround({ taskId: this.taskId,pipeCode: pipe.pipeSegmentCode })
          .then((res) => {
            this.pipeAroundTotal = {
              people: res.populationWkt.length,
              place: res.specificWkt.length
            }
          })
        requestDom(() => this.$refs['table']?.$refs['basemap'])
          .then((comp) => {
            this.onTableGetData([pipe])
          })
      },
      onTableGetData (data) {
        this.mapRef.pipeRadiusRemove();
        this.mapRef.pipeRender(data);
      },
      async handleTableRowClick (row) {
        const { code,data } = await lineAround({ id: row.id });
        if (code === 200) {

          const { regionWkt,flammableWkt,specificWkt,populationWkt } = data;
          //影响半径
          regionWkt && this.mapRef.pipeRadiusRender(regionWkt);
          //人居
          populationWkt.length && (this.mapRef.renderMarkerByType(populationWkt,1)
            .then(layer => {
              this.__populationLayer = layer;
            }));
          //特定场所
          specificWkt.length && (this.mapRef.renderMarkerByType(specificWkt,2)
            .then(layer => {
              this.__placeLayer = layer;
            }));
          //易燃易爆场所
          flammableWkt.length && (this.mapRef.renderMarkerByType(flammableWkt,3)
            .then(layer => {
              this.__boomLayer = layer;
            }));

        }
      },
      onPopulationChange (val) {
        this.__populationLayer && this.__populationLayer.toggleVisibility(val)
      },
      onPlaceChange (val) {
        this.__placeLayer && this.__placeLayer.toggleVisibility(val)
      },
    }
  }
</script>

<style lang="scss" scoped>
.level-wrapper {
  width: 100%;
  height: 100%;

  .level-top {
    height: 50px;
    margin-bottom: 10px;
  }

  .level-content {
    height: calc(100% - 60px);
    width: 100%;
    display: flex;

    .level-content-left {
      width: 340px;
      height: 100%;
      margin-right: 10px;
      padding: 8px;

      ::v-deep .el-scrollbar {
        height: 100%;
        background-color: #EEF2F6;

        .el-scrollbar__wrap {
          overflow-x: hidden;
        }
      }
    }

    .level-content-right {
      flex: 1;
      margin: 0;
      display: flex;
      flex-direction: column;

      .right-content {
        flex: 1;
        position: relative;
      }

      .right-footer {
        background-color: #fff;
        display: flex;
        justify-content: center;
        padding-top: 6px;
        padding-bottom: 6px;
      }
    }
  }

}
</style>