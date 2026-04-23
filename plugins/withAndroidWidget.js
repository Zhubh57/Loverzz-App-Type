const { withAndroidManifest, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to inject Android Widget native code.
 */
const withAndroidWidget = (config) => {
  // 1. Inject Manifest Receiver
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Add receiver for NoteWidgetProvider
    if (!mainApplication.receiver) mainApplication.receiver = [];
    
    const hasWidgetReceiver = mainApplication.receiver.some(
      (r) => r.$['android:name'] === '.NoteWidgetProvider'
    );

    if (!hasWidgetReceiver) {
      mainApplication.receiver.push({
        $: {
          'android:name': '.NoteWidgetProvider',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_info',
            },
          },
        ],
      });
    }

    return config;
  });

  // 2. Inject WidgetPackage into MainApplication.kt
  config = withMainApplication(config, (config) => {
    let content = config.modResults.contents;
    
    // Import the package explicitly even if in same package to avoid ambiguous resolution
    if (!content.includes('import com.shubham.loverzz.WidgetPackage')) {
      content = content.replace(
        /package com\.shubham\.loverzz/,
        'package com.shubham.loverzz\n\nimport com.shubham.loverzz.WidgetPackage'
      );
    }
    
    // Add the package to the list
    if (!content.includes('WidgetPackage()')) {
      // Find the packages list and add .toMutableList() to make it editable
      content = content.replace(
        /PackageList\(this\)\.packages/,
        'PackageList(this).packages.toMutableList()'
      );
      
      // Now inject our package into the apply block
      const applyRegex = /packages\.toMutableList\(\)\.apply\s*\{/;
      content = content.replace(applyRegex, 'packages.toMutableList().apply {\n            add(WidgetPackage())');
    }
    
    config.modResults.contents = content;
    return config;
  });

  // 3. Write Kotlin and XML files (Dangerous Mod)
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.projectRoot;
      const androidRoot = path.join(root, 'android');
      
      const packagePath = path.join(androidRoot, 'app/src/main/java/com/shubham/loverzz');
      const resPath = path.join(androidRoot, 'app/src/main/res');

      // Ensure directories exist
      fs.mkdirSync(packagePath, { recursive: true });
      fs.mkdirSync(path.join(resPath, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(resPath, 'xml'), { recursive: true });

      // --- Kotlin Files ---

      // NoteWidgetProvider.kt
      const providerContent = `package com.shubham.loverzz

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.graphics.BitmapFactory
import com.shubham.loverzz.R
import java.io.File

class NoteWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val sharedPref = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        val imagePath = sharedPref.getString("latest_doodle_path", null)

        val views = RemoteViews(context.packageName, R.layout.widget_note)
        
        if (imagePath != null && File(imagePath).exists()) {
            val bitmap = BitmapFactory.decodeFile(imagePath)
            views.setImageViewBitmap(R.id.widget_image, bitmap)
        }

        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}`;
      fs.writeFileSync(path.join(packagePath, 'NoteWidgetProvider.kt'), providerContent);

      // WidgetModule.kt
      const moduleContent = `package com.shubham.loverzz

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "WidgetModule"

    @ReactMethod
    fun updateWidget(imagePath: String) {
        val context = reactApplicationContext
        val sharedPref = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("latest_doodle_path", imagePath)
            apply()
        }

        val intent = Intent(context, NoteWidgetProvider::class.java)
        intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        val ids = AppWidgetManager.getInstance(context)
            .getAppWidgetIds(ComponentName(context, NoteWidgetProvider::class.java))
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}`;
      fs.writeFileSync(path.join(packagePath, 'WidgetModule.kt'), moduleContent);

      // WidgetPackage.kt
      const packageContent = `package com.shubham.loverzz

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class WidgetPackage : ReactPackage {
    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(WidgetModule(reactContext))
}`;
      fs.writeFileSync(path.join(packagePath, 'WidgetPackage.kt'), packageContent);

      // --- XML Files ---

      // layout/widget_note.xml
      const layoutContent = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#FFFFFF"
    android:orientation="vertical"
    android:gravity="center">

    <ImageView
        android:id="@+id/widget_image"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:scaleType="fitCenter"
        android:padding="8dp" />
</LinearLayout>`;
      fs.writeFileSync(path.join(resPath, 'layout/widget_note.xml'), layoutContent);

      // xml/widget_info.xml
      const infoContent = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="40dp"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/widget_note"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />`;
      fs.writeFileSync(path.join(resPath, 'xml/widget_info.xml'), infoContent);

      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidWidget;
