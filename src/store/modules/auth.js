import { getPermission } from '@/api/base'
import router from '@/router'
import cloneDeep from 'lodash/cloneDeep'
import { getMainPath, treeTravels, isMain, getPermission as getMainAuthState } from '@/message'

export default {
  namespaced: true,
  state: {
    appCode: '',
    userName: '',
    menuData: [],
    userinfo: {},
    funCode: [],
    btnInfo: [],
    viewPageId: null,
    navActiveCode: null,
    mainLocation: {},
    mainBtnAuthed: [],
    mainUserinfo: {},
  },
  mutations: {
    SET_PERMISSION(state, data) {
      const { userName, fun, appCode, funCode } = data
      state.userinfo = data
      state.userName = userName
      state.appCode = appCode
      state.funCode = funCode
      state.menuData = fun
      state.menuData && router.createRouter(state.menuData)
      const travel = treeTravels(fun);
      travel({
        every(node) {
          if (node.funType === 1) {
            // btn
            const indexOf = state.btnInfo.findIndex(
              n => n.funCode === node.funCode
            )
            if (indexOf > -1) {
              state.btnInfo.splice(indexOf, 1, node)
            } else {
              state.btnInfo.push(node)
            }
          }
        }
      })
    },
    SET_VIEWPAGE_ID(state, data) {
      state.viewPageId = data
      // state.viewPageId = "1639232056653504514";
    },
    SET_NAV_ACTIVE_CODE(state, data) {
      state.navActiveCode = data
    },
    SET_MAIN_LOCATION(state, data) {
      Object.assign(state.mainLocation, data)
    },
    PATCH_MAIN_AUTH(state, node) {
      const indexOf = state.mainBtnAuthed.findIndex(
        n => n.funCode === node.funCode
      )
      if (indexOf > -1) {
        state.mainBtnAuthed.splice(indexOf, 1, node)
      }
      else {
        state.mainBtnAuthed.push(node)
      }
    },
    SET_MAIN_USERINFO(state, data) {
      state.mainUserinfo = data;
    }
  },
  actions: {
    async getPermission({ commit, state }) {
      const { code, data } = await getPermission();
      if (code === 200) {
        commit('SET_PERMISSION', data)
      }
      if (!isMain()) {
        const pathInfo = await getMainPath();
        commit('SET_MAIN_LOCATION', pathInfo);
        //todo 查找当前应用的权限配置
        const { userinfo } = await getMainAuthState();
        commit('SET_MAIN_USERINFO', userinfo);
        const { menuData, funCode } = userinfo;
        const travel = treeTravels(menuData)
        const { pathname } = state.mainLocation
        travel({
          every(node) {
            // btn
            if (node.funType === 1) {
              if (node.route) {
                if (node.route === pathname) {
                  commit('PATCH_MAIN_AUTH', node)
                }
              }
              else {
                commit('PATCH_MAIN_AUTH', node)
              }
            }
          }
        })
        const nodes = funCode.map(fc => ({ funCode: fc }))
        nodes.forEach((node) => {
          commit('PATCH_MAIN_AUTH', node)
        })
      }
      return state.menuData
    }
  },
  getters: {
    subnavMenu: state => {
      let { menuData, navActiveCode } = state
      menuData = cloneDeep(menuData)
      let res = []
      while (menuData.length) {
        const node = menuData.shift()
        if (node.funCode === navActiveCode) {
          res = node.children
          menuData = []
        } else {
          node.children && menuData.push(...node.children)
        }
      }
      return res
    }
  }
}
