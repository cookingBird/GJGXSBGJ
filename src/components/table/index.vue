<template>
<div
  class="gislife-table-wrapper"
  v-observe="onTableResize"
>
  <slot name="top"></slot>
  <el-table
    ref="table"
    class="gislife-table"
    v-bind="$attrs"
    v-on="$listeners"
    v-loading="loading"
    :data="tableData"
    :border="initCom.border"
    :class="config.class"
    v-observe:tableEmptyRow
    :max-height="maxHeight"
    style="width: 100%"
  >
    <!-- 表格前部插槽 -->
    <slot name="prepend"></slot>
    <!-- 多选 -->
    <el-table-column
      type="selection"
      v-if="initCom.selection"
    > </el-table-column>
    <!-- 索引 -->
    <el-table-column
      v-if="initCom.index"
      type="index"
      :label="initCom.indexName || '序号'"
      width="80px"
      align="center"
    >
    </el-table-column>
    <!-- 普通列 -->
    <template v-for="(item, index) in tableColumns">
      <Column
        v-if="item.children && item.children.length"
        :columnsHeader="item"
        :key="'custom-column' + index"
      >
      </Column>
      <el-table-column
        v-else
        ref="cols"
        v-bind="item"
        :prop="item.prop"
        :label="item.label"
        :align="item.align || 'center'"
        :key="'el-column' + index"
        :show-overflow-tooltip="item.overflowTooltip ?? true"
      >
        <template #default="scope">
          <!-- 插槽,插槽名为对应prop,不使用可不写插槽 -->
          <slot
            :name="item.prop"
            :column="scope.column"
            :row="scope.row"
          >
            {{
              item.format
              ? item.format(scope.row[item.prop])
              : scope.row[item.prop]
            }}
          </slot>
        </template>
      </el-table-column>
    </template>
    <!-- 按钮组 -->
    <el-table-column
      v-if="initCom.buttons"
      :label="initCom.buttons.label || '操作'"
      :align="initCom.buttons.align || 'center'"
      :width="initCom.buttons.width"
      :fixed="initCom.buttons.fixed"
    >
      <template v-slot="scope">
        <el-button
          v-for="(btn, index) in initCom.buttons.list"
          :key="index"
          :type="btn.type || 'text'"
          :size="btn.size"
          @click.stop="(btn.click&&btn.click(scope.row) )|| handleCommand(btn.key, scope.row)"
        >
          {{ btn.label }}
        </el-button>
      </template>
    </el-table-column>
    <!-- 表格尾部插槽 -->
    <slot name="append"></slot>
    <!-- 暂无数据提示 -->
    <template v-slot:empty>
      <slot name="empty"> 暂无数据 </slot>
    </template>
  </el-table>
  <slot name="bottom"></slot>
  <pagination
    v-if="isPagination"
    class="gislife-table-pagination"
    :pageParams="pageParams"
    :total="total"
    :config="paginationConfig"
    @size-change="refresh()"
    @current-change="refresh()"
    @prev-click="refresh()"
    @next-click="refresh()"
  ></pagination>
</div>
</template>

<script>
  import request from '@/utils/request';
  import { createXHR } from './MyXHR'
  import Column from './column';
  import pagination from './pagination.vue';
  export default {
    name: 'common-table',
    inheritAttrs: false,
    components: {
      Column,
      pagination,
    },
    props: {
      // 表头
      tableColumns: {
        type: Array,
        default: () => [],
      },
      //表格数据
      data: {
        type: Array,
        default: () => ([]),
      },
      //表格初始配置（多选 or index、按钮组）
      config: {
        type: Object,
        default: () => {
          return {};
        },
      },
      // 高度
      height: {
        type: [String,Number],
      },
      // 是否分页
      isPagination: {
        type: Boolean,
        default: true,
      },
      // 表格查询参数
      pageParams: {
        type: Object,
        default: () => {
          return {
            pageNo: 1,
            pageSize: 10,
          };
        },
      },
      // 分页配置
      paginationConfig: {
        type: Object,
        default: () => ({
          "pageNo": 1,
          "pageSize": 10,
        }),
      },
      baseURL: {
        type: String,
        default: window.URL_CONFIG.baseUrl,
      },
      // 获取表格数据接口Api
      url: {
        type: String,
      },
      // 查询参数
      query: {
        Type: Object,
        default () {
          return {};
        },
      },
      // 请求方法（默认POST）
      reqMethods: {
        Type: String,
        default: 'POST',
      },
      // 解析表格数据
      parseTableData: {
        Type: Function,
        default () {
          return ({ data,code }) => {
            if (code == 200) {
              return { data: data.data,total: data.totalCount };
            }
            return {};
          };
        },
      },
      pageNo: {
        Type: String,
        default: 'pageNo',
      },
      pageSize: {
        Type: String,
        default: 'pageSize',
      },
    },
    data () {
      return {
        total: 30,
        loading: false,
        tableData: this.data,
        maxHeight: void 0,
      };
    },
    computed: {
      initCom () {
        const config = this.config ?? {};
        return {
          border: config.border ?? true,
          index: config.index ?? true,
          ...config,
        };
      },
      queryData: {
        get () {
          return { ...this.query,...this.pageParams };
        },
        set (val) {
          this.$emit('changeQuery',val);
        },
      },
    },

    created () {
      this.refresh();
    },
    methods: {
      // 按钮组操作
      handleCommand (key,row) {
        this.$emit('handleCommand',key,row);
      },
      // 刷新数据
      async refresh (pas) {
        let params = Object.assign(this.queryData,pas);
        // console.log('refresh---------',params)
        this.loading = true;
        try {
          let dataS = await this.getData(params);
          if (dataS) {
            let { data,total } = this.parseTableData(dataS);
            this.tableData = data;
            this.total = total;
            this.$emit('onData',data);
          }
        } catch (error) {
          console.error(error)
          this.$message.error('获取表格信息失败');
        } finally {
          this.loading = false;
        }
      },
      // 获取数据
      async getData (query) {
        if (!this.url) {
          return;
        }
        if (!this.__xhr) {
          this.__xhr = createXHR({
            baseURL: this.baseURL,
            url: this.url,
            method: this.reqMethods.trim().toUpperCase(),
            headers: {
              token: () => sessionStorage.getItem('token')
            }
          })
        }
        let params = { baseURL: this.baseURL,url: this.url,method: this.reqMethods };
        if (this.reqMethods === 'GET') {
          params = { ...params,params: query };
        } else {
          params = { ...params,data: query };
        }
        return request(params);
        // return this.__xhr.send({
        //   params: query,
        //   data: query
        // }).then(res => res.data)
      },
      handleWrapperChange (entry) {
        const maxHeight = this.$refs.table?.$el?.getBoundingClientRect().height;
        this.maxHeight = maxHeight;
      },
      onTableResize (entry) {
        const table = entry.target.querySelector('.el-table');
        const tableBoundingClientRect = table.getBoundingClientRect();
        this.maxHeight = Math.floor(tableBoundingClientRect.height);
        const tableWrapper = table.querySelector('.el-table__body-wrapper');
        tableWrapper.style.height = '100%'
      }
    },
  };
</script>

<style lang="css">
  .pagination-content {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* .gislife-table-wrapper .gislife-table .el-table__body-wrapper{
    overflow-x: scroll;
  } */

  .gislife-table-wrapper {
    --el-y-gutter: 7;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 100%;
  }

  .gislife-table-wrapper>.gislife-table {
    height: 100%;
  }

  .gislife-table-wrapper> :not([hidden])~ :not([hidden]) {
    margin-top: calc(var(--el-y-gutter) * 1px);
  }

  .gislife-table-wrapper> :not(.gislife-table) {
    flex-grow: 0;
  }

  .gislife-table-wrapper .gislife-table {
    flex-grow: 1;
  }

  .gislife-table-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>