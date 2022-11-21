package com.metaim.android.lib.js

import android.content.Context
import com.metaim.android.lib.bridge.JsWebView
import com.metaim.android.lib.bridge.WVJBResponseCallback
import com.metaim.android.lib.gson.GsonObj
import org.json.JSONArray
import org.json.JSONObject
import java.lang.reflect.ParameterizedType

object JsBridgeObj : JsBridge {
    private lateinit var mWebView: JsWebView

    override fun init(context: Context) {
        if (!::mWebView.isInitialized) mWebView = JsWebView(context.applicationContext).apply {
            loadUrlByHandler("file:///android_asset/im_web3.html")
        }
    }

    override fun <T> callJsFunc(handlerName: String, params: Map<String, Any?>, callback: JsCallback<T>?) {
        val jsonObjParams = if (params.isNotEmpty()) {
            val jsonObject = JSONObject()
            params.forEach { (key, value) ->
                if (value == null) return@forEach
                if (value is List<*>) {
                    val jsonArray = JSONArray()
                    value.forEach { jsonArray.put(it) }
                    jsonObject.put(key, jsonArray)
                } else {
                    jsonObject.put(key, value)
                }
            }
            jsonObject
        } else null
        val startTime = System.currentTimeMillis()
        mWebView.callHandler(handlerName, jsonObjParams, if (callback == null) null else WVJBResponseCallback<JSONObject> { jsonObj ->
            try {
                val dataJsonString = jsonObj.getString("data")
                val xx = dataJsonString.ifEmpty { jsonObj.toString() }
                val code = jsonObj.getString("code")
                if ("000000" == code) {
                    val tType = (callback.javaClass.genericInterfaces[0] as ParameterizedType).actualTypeArguments[0]
                    val data = GsonObj.gson.fromJson(jsonObj.getString("data"), tType) as T
                    callback.onSuccess(data)
                } else {
                    val reason = try {
                        if (jsonObj.has("data")) {
                            jsonObj.getJSONObject("data").getString("reason")
                        } else {
                            jsonObj.getString("msg")
                        }
                    } catch (e: Exception) {
                        null
                    }
                    val exception = JsException("$reason")
                    callback.onError(exception)
                }
            } catch (e: Exception) {
                callback.onError(e)
            }
        })
    }
}