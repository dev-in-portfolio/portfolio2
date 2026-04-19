import { _ as __nuxt_component_0 } from './nuxt-link-DIKBE9Q1.mjs';
import { defineComponent, ref, mergeProps, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderList, ssrInterpolate, ssrRenderComponent } from 'vue/server-renderer';
import { _ as _export_sfc } from './server.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const pages = ref([]);
    const title = ref("");
    const slug = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "page" }, _attrs))} data-v-def9b0f8><header class="hero" data-v-def9b0f8><h1 data-v-def9b0f8>CardPress Dashboard</h1><p data-v-def9b0f8>Create, edit, and publish card-driven pages with a clean editorial workflow.</p></header><section class="panel composer" data-v-def9b0f8><h2 data-v-def9b0f8>New Page</h2><p class="sub" data-v-def9b0f8>Start a draft, then build cards in the editor.</p><div class="row compose-row" data-v-def9b0f8><input${ssrRenderAttr("value", unref(title))} placeholder="Title" data-v-def9b0f8><input${ssrRenderAttr("value", unref(slug))} placeholder="slug" data-v-def9b0f8><button class="primary" data-v-def9b0f8>Create</button></div></section><section class="grid" data-v-def9b0f8><!--[-->`);
      ssrRenderList(unref(pages), (page) => {
        _push(`<article class="card" data-v-def9b0f8><h3 data-v-def9b0f8>${ssrInterpolate(page.title)}</h3><p class="muted" data-v-def9b0f8>/${ssrInterpolate(page.slug)}</p><p class="muted" data-v-def9b0f8>Status: ${ssrInterpolate(page.status)}</p><div class="actions" data-v-def9b0f8>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          class: "action edit",
          to: `/edit/${page.id}`
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Edit`);
            } else {
              return [
                createTextVNode("Edit")
              ];
            }
          }),
          _: 2
        }, _parent));
        if (page.published_slug) {
          _push(ssrRenderComponent(_component_NuxtLink, {
            class: "action live",
            to: `/p/${page.published_slug}`
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`Public`);
              } else {
                return [
                  createTextVNode("Public")
                ];
              }
            }),
            _: 2
          }, _parent));
        } else {
          _push(`<!---->`);
        }
        _push(`</div></article>`);
      });
      _push(`<!--]--></section></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-def9b0f8"]]);

export { index as default };
//# sourceMappingURL=index-CqmeRKZC.mjs.map
