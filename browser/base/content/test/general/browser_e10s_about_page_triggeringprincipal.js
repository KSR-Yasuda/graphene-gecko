"use strict";
Cu.import("resource://gre/modules/Services.jsm");

registerCleanupFunction(function() {
  Services.ppmm.broadcastAsyncMessage("AboutPrincipalTest:Unregister");
  BrowserTestUtils.waitForMessage(Services.ppmm, "AboutPrincipalTest:Unregistered").then(
    Services.ppmm.removeDelayedProcessScript(
      "chrome://mochitests/content/browser/browser/base/content/test/general/file_register_about_page.js"
    )
  );
});

add_task(function* test_principal_click() {
  Services.ppmm.loadProcessScript(
    "chrome://mochitests/content/browser/browser/base/content/test/general/file_register_about_page.js",
    true
  );

  yield BrowserTestUtils.withNewTab("about:test-about-principal-parent", function*(browser) {
    let loadPromise = BrowserTestUtils.browserLoaded(browser, false, "about:test-about-principal-child");
    let myLink = browser.contentDocument.getElementById("aboutchildprincipal");
    myLink.click();
    yield loadPromise;

    yield ContentTask.spawn(gBrowser.selectedBrowser, {}, function*() {
      let channel = content.document.docShell.currentDocumentChannel;
      is(channel.originalURI.asciiSpec,
         "about:test-about-principal-child",
         "sanity check - make sure we test the principal for the correct URI");

      let triggeringPrincipal = channel.loadInfo.triggeringPrincipal;
      ok(Services.scriptSecurityManager.isSystemPrincipal(triggeringPrincipal),
         "loading about: from privileged page must have a triggering of System");

      let contentPolicyType = channel.loadInfo.externalContentPolicyType;
      is(contentPolicyType, Ci.nsIContentPolicy.TYPE_DOCUMENT,
        "sanity check - loading a top level document");

      let loadingPrincipal = channel.loadInfo.loadingPrincipal;
      is(loadingPrincipal, null,
         "sanity check - load of TYPE_DOCUMENT must have a null loadingPrincipal");
    });
  });
});

add_task(function* test_principal_ctrl_click() {
  yield SpecialPowers.pushPrefEnv({
    "set": [["security.sandbox.content.level", 1]],
  });

  yield BrowserTestUtils.withNewTab("about:test-about-principal-parent", function*(browser) {
    let loadPromise = BrowserTestUtils.waitForNewTab(gBrowser, "about:test-about-principal-child");
    // simulate ctrl+click
    BrowserTestUtils.synthesizeMouseAtCenter("#aboutchildprincipal",
                                             { ctrlKey: true, metaKey: true },
                                             gBrowser.selectedBrowser);
    let tab = yield loadPromise;
    gBrowser.selectTabAtIndex(2);

    yield ContentTask.spawn(gBrowser.selectedBrowser, {}, function*() {
      let channel = content.document.docShell.currentDocumentChannel;
      is(channel.originalURI.asciiSpec,
         "about:test-about-principal-child",
         "sanity check - make sure we test the principal for the correct URI");

      let triggeringPrincipal = channel.loadInfo.triggeringPrincipal;
      ok(Services.scriptSecurityManager.isSystemPrincipal(triggeringPrincipal),
         "loading about: from privileged page must have a triggering of System");

      let contentPolicyType = channel.loadInfo.externalContentPolicyType;
      is(contentPolicyType, Ci.nsIContentPolicy.TYPE_DOCUMENT,
        "sanity check - loading a top level document");

      let loadingPrincipal = channel.loadInfo.loadingPrincipal;
      is(loadingPrincipal, null,
         "sanity check - load of TYPE_DOCUMENT must have a null loadingPrincipal");
    });
    yield BrowserTestUtils.removeTab(tab);
  });
});

add_task(function* test_principal_right_click_open_link_in_new_tab() {
  yield SpecialPowers.pushPrefEnv({
    "set": [["security.sandbox.content.level", 1]],
  });

  yield BrowserTestUtils.withNewTab("about:test-about-principal-parent", function*(browser) {
    let loadPromise = BrowserTestUtils.waitForNewTab(gBrowser, "about:test-about-principal-child");

    // simulate right-click open link in tab
    BrowserTestUtils.waitForEvent(document, "popupshown", false, event => {
      // These are operations that must be executed synchronously with the event.
      document.getElementById("context-openlinkintab").doCommand();
      event.target.hidePopup();
      return true;
    });
    BrowserTestUtils.synthesizeMouseAtCenter("#aboutchildprincipal",
                                             { type: "contextmenu", button: 2 },
                                             gBrowser.selectedBrowser);

    let tab = yield loadPromise;
    gBrowser.selectTabAtIndex(2);

    yield ContentTask.spawn(gBrowser.selectedBrowser, {}, function*() {
      let channel = content.document.docShell.currentDocumentChannel;
      is(channel.originalURI.asciiSpec,
         "about:test-about-principal-child",
         "sanity check - make sure we test the principal for the correct URI");

      let triggeringPrincipal = channel.loadInfo.triggeringPrincipal;
      ok(Services.scriptSecurityManager.isSystemPrincipal(triggeringPrincipal),
         "loading about: from privileged page must have a triggering of System");

      let contentPolicyType = channel.loadInfo.externalContentPolicyType;
      is(contentPolicyType, Ci.nsIContentPolicy.TYPE_DOCUMENT,
        "sanity check - loading a top level document");

      let loadingPrincipal = channel.loadInfo.loadingPrincipal;
      is(loadingPrincipal, null,
         "sanity check - load of TYPE_DOCUMENT must have a null loadingPrincipal");
    });
    yield BrowserTestUtils.removeTab(tab);
  });
});
