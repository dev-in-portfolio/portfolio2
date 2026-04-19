import { defineComponent, ref, computed, mergeProps, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderAttr } from 'vue/server-renderer';
import { _ as _export_sfc, d as useRoute } from './server.mjs';
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
  __name: "[id]",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute();
    route.params.id;
    const page = ref(null);
    const cards = ref([]);
    const activeId = ref(null);
    const status = ref("");
    const activeCard = computed(() => cards.value.find((card) => card.id === activeId.value));
    return (_ctx, _push, _parent, _attrs) => {
      var _a, _b;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "page" }, _attrs))} data-v-2b9a583f><header class="hero" data-v-2b9a583f><h1 data-v-2b9a583f>${ssrInterpolate((_a = unref(page)) == null ? void 0 : _a.title)}</h1><p class="muted" data-v-2b9a583f>/${ssrInterpolate((_b = unref(page)) == null ? void 0 : _b.slug)}</p><div class="actions" data-v-2b9a583f><button class="primary" data-v-2b9a583f>Publish</button><span class="muted" data-v-2b9a583f>${ssrInterpolate(unref(status))}</span></div></header><div class="editor" data-v-2b9a583f><section class="panel" data-v-2b9a583f><h2 data-v-2b9a583f>Cards</h2><div class="actions" data-v-2b9a583f><button class="ghost" data-v-2b9a583f>Text</button><button class="ghost" data-v-2b9a583f>Image</button><button class="ghost" data-v-2b9a583f>Quote</button><button class="ghost" data-v-2b9a583f>Embed</button></div><ul class="list" data-v-2b9a583f><!--[-->`);
      ssrRenderList(unref(cards), (card) => {
        _push(`<li data-v-2b9a583f><button class="ghost" data-v-2b9a583f>${ssrInterpolate(card.ord)} \xB7 ${ssrInterpolate(card.title)}</button></li>`);
      });
      _push(`<!--]--></ul></section>`);
      if (unref(activeCard)) {
        _push(`<section class="panel" data-v-2b9a583f><h2 data-v-2b9a583f>Edit Card</h2><input${ssrRenderAttr("value", unref(activeCard).title)} data-v-2b9a583f><textarea data-v-2b9a583f>${ssrInterpolate(unref(activeCard).body)}</textarea>`);
        if (unref(activeCard).type === "image") {
          _push(`<input${ssrRenderAttr("value", unref(activeCard).image_url)} placeholder="Image URL" data-v-2b9a583f>`);
        } else {
          _push(`<!---->`);
        }
        if (unref(activeCard).type === "embed") {
          _push(`<input${ssrRenderAttr("value", unref(activeCard).embed_url)} placeholder="Embed URL" data-v-2b9a583f>`);
        } else {
          _push(`<!---->`);
        }
        _push(`<div class="actions" data-v-2b9a583f><button class="ghost" data-v-2b9a583f>Move Up</button><button class="ghost" data-v-2b9a583f>Move Down</button><button class="danger" data-v-2b9a583f>Delete</button></div></section>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<section class="panel" data-v-2b9a583f><h2 data-v-2b9a583f>Preview</h2><!--[-->`);
      ssrRenderList(unref(cards), (card) => {
        _push(`<div class="card" data-v-2b9a583f><h3 data-v-2b9a583f>${ssrInterpolate(card.title)}</h3>`);
        if (card.type === "quote") {
          _push(`<p data-v-2b9a583f>\u201C${ssrInterpolate(card.body)}\u201D</p>`);
        } else {
          _push(`<p data-v-2b9a583f>${ssrInterpolate(card.body)}</p>`);
        }
        if (card.type === "image") {
          _push(`<img${ssrRenderAttr("src", card.image_url)} data-v-2b9a583f>`);
        } else {
          _push(`<!---->`);
        }
        if (card.type === "embed") {
          _push(`<iframe${ssrRenderAttr("src", card.embed_url)} data-v-2b9a583f></iframe>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div>`);
      });
      _push(`<!--]--></section></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/edit/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _id_ = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2b9a583f"]]);

export { _id_ as default };
//# sourceMappingURL=_id_-HbXAOGtr.mjs.map
