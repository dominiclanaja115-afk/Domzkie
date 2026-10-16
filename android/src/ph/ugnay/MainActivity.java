/* UgnayPH — Pinoy Social Media App
 * Created by: Dominic R. Lanaja
 * Copyright © 2026. All Rights Reserved. */
package ph.ugnay;
import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.os.Environment;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.*;
import android.widget.*;

/** Small HTTPS client. The server URL belongs to the operator, never to an advertising network. */
public class MainActivity extends Activity {
 private WebView web;
 private String origin;
 private ValueCallback<Uri[]> fileCallback;
 private PermissionRequest microphone;
 private LinearLayout root;
 private int dp(int n) { return (int)(n * getResources().getDisplayMetrics().density); }
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(23,62,104));
  getWindow().setNavigationBarColor(Color.WHITE);
  getPreferences(0).edit().remove("server").apply();
  if(ServerConfig.ORIGIN.isEmpty()) showPending(); else connect(ServerConfig.ORIGIN);
 }
 private LinearLayout base() {
  LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setBackgroundColor(Color.WHITE);
  layout.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  setContentView(layout);root=layout;return layout;
 }
 private TextView text(String value,int size,int color) {TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setPadding(0,dp(9),0,dp(9));return t;}
 private void showPending() {
  LinearLayout outer=base();
  ScrollView scroll=new ScrollView(this);
  outer.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
  LinearLayout content=new LinearLayout(this);
  content.setOrientation(LinearLayout.VERTICAL);
  content.setPadding(dp(28),dp(40),dp(28),dp(30));
  scroll.addView(content);
  content.addView(text("☀  UgnayPH",32,Color.rgb(23,62,104)));
  content.addView(text("Your Filipino Home Online",22,Color.rgb(37,52,73)));
  content.addView(text("Malapit na!",26,Color.rgb(23,62,104)));
  content.addView(text("Our community is coming soon.\nAng ating komunidad ay malapit nang magbukas.",17,Color.rgb(100,118,136)));
  content.addView(text("This preview is waiting for the online service. Install the final update to sign in, share posts, and send messages.",15,Color.rgb(100,118,136)));
  TextView credit=text("Created by: Dominic R. Lanaja",13,Color.WHITE);
  credit.setGravity(Gravity.CENTER);
  credit.setPadding(dp(10),dp(15),dp(10),dp(15));
  credit.setBackgroundColor(Color.rgb(23,62,104));
  outer.addView(credit,new LinearLayout.LayoutParams(-1,-2));
 }
 private boolean trusted(Uri uri) {
  Uri allowed=Uri.parse(origin);return "https".equals(uri.getScheme())&&allowed.getHost().equalsIgnoreCase(uri.getHost()==null?"":uri.getHost())&&(allowed.getPort()==-1?443:allowed.getPort())==(uri.getPort()==-1?443:uri.getPort())&&uri.getUserInfo()==null;
 }
 private void connect(String url) {
  origin=url;LinearLayout layout=base();LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER_VERTICAL);bar.setPadding(dp(10),0,dp(8),0);bar.setBackgroundColor(Color.rgb(23,62,104));
  TextView title=text("UgnayPH\nCreated by: Dominic R. Lanaja",12,Color.WHITE);bar.addView(title,new LinearLayout.LayoutParams(0,dp(58),1));
  Button menu=new Button(this);menu.setText("⋮");menu.setContentDescription("App options");bar.addView(menu,new LinearLayout.LayoutParams(dp(48),dp(42)));layout.addView(bar);
  menu.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("UgnayPH").setItems(new String[]{"Reload","About"},(d,which)->{if(which==0)web.loadUrl(origin);else new AlertDialog.Builder(this).setTitle("UgnayPH — Your Filipino Home Online").setMessage("Created by: Dominic R. Lanaja\nVersion 1.1 — For Every Filipino, Everywhere").setPositiveButton("OK",null).show();}).show());
  web=new WebView(this);layout.addView(web,new LinearLayout.LayoutParams(-1,0,1));
  WebSettings settings=web.getSettings();settings.setCacheMode(WebSettings.LOAD_DEFAULT);settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);settings.setSafeBrowsingEnabled(true);
  CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(trusted(uri))return false;if("https".equals(uri.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}}return true;}
   @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError error){if(req.isForMainFrame())new AlertDialog.Builder(MainActivity.this).setTitle("Unable to connect").setMessage("We could not connect right now. Check your internet connection and try again.").setPositiveButton("Retry",(d,w)->web.loadUrl(origin)).setNegativeButton("Close",null).show();}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;try{startActivityForResult(params.createIntent(),101);}catch(Exception e){fileCallback.onReceiveValue(null);fileCallback=null;}return true;}
   @Override public void onPermissionRequest(PermissionRequest request){runOnUiThread(()->{boolean audio=false;for(String resource:request.getResources())if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource))audio=true;if(!trusted(request.getOrigin())||!audio){request.deny();return;}if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else{if(microphone!=null)microphone.deny();microphone=request;requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},102);}});}
   @Override public void onPermissionRequestCanceled(PermissionRequest request){if(microphone==request)microphone=null;}
  });
  web.setDownloadListener((download,userAgent,disposition,mime,length)->{
   if(!trusted(Uri.parse(download)))return;
   try {
    DownloadManager.Request request=new DownloadManager.Request(Uri.parse(download));
    request.addRequestHeader("Cookie",CookieManager.getInstance().getCookie(download));
    request.setMimeType(mime);
    String filename=URLUtil.guessFileName(download,disposition,mime);
    request.setTitle(filename);
    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
    request.setDestinationInExternalFilesDir(this,Environment.DIRECTORY_DOWNLOADS,System.currentTimeMillis()+"-"+filename);
    ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
    Toast.makeText(this,"Downloading attachment",Toast.LENGTH_SHORT).show();
   } catch(Exception error) {Toast.makeText(this,"Unable to download attachment. Please try again.",Toast.LENGTH_LONG).show();}
  });
  web.loadUrl(origin);
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==101&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileCallback=null;}}
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(request==102&&microphone!=null){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED&&web!=null&&trusted(microphone.getOrigin()))microphone.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});else microphone.deny();microphone=null;}}
 @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
 @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();if(web!=null)web.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
 @Override protected void onDestroy(){if(microphone!=null)microphone.deny();if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null)web.destroy();super.onDestroy();}
}
