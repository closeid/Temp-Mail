# Admin 用户相关

## 用户管理页面

![admin-user-management](/feature/admin-user-management.png)

## 用户设置

此处开启用户登录，以及验证等配置

![admin-user-page](/feature/admin-user-page.png)

## 角色地址配置

“角色地址配置”限制某个用户角色最多可以绑定多少个邮箱地址。角色级限制优先于“用户设置”中的全局地址上限；留空表示继承全局设置，`0` 表示不限制。该配置只影响用户绑定地址的数量，不会改变角色权限，也不会删除已经绑定的地址。
