# DevOps CI CD 介绍

持续集成工具：

- Jenkins
- gitlabci
- Tekton

本章基于k8s集群部署gitlab、sonarQube、Jenkins等工具，并把上述工具集成到Jenkins中，以Django项目和SpringBoot项目为例，通过多分支流水线及Jenkinsfile实现项目代码提交到不同的仓库分支，实现自动代码扫描、单元测试、docker容器构建、k8s服务的自动部署。

- DevOps、CI、CD介绍
- Jenkins、sonarQube、gitlab的快速部署
- Jenkins初体验
- 流水线入门及Jenkinsfile使用
- Jenkins与Kubernetes的集成
- sonarQube代码扫描与Jenkins的集成
- 实践Django项目的基于Jenkinsfile实现开发、测试环境的CI/CD

#### [DevOps、CI、CD介绍](http://49.7.203.222:2023/#/devops/introduction?id=devops、ci、cd介绍)

Continuous Integration (*CI*) / Continuous Delivery (*CD*)

软件交付流程

![img](./7基于Kubernetes的DevOps平台实践.assets/devops-roles.jpg)

```text
软件交付流程(各阶段):
  规划 -> 编码 -> 构建 -> 测试 -> 发布 -> 部署 -> 维护
  (角色: 开发 / 测试 / 运维 分工协作)
```


一个软件从零开始到最终交付，大概包括以下几个阶段：规划、编码、构建、测试、发布、部署和维护，基于这些阶段，我们的软件交付模型大致经历了几个阶段：

##### [瀑布式流程](http://49.7.203.222:2023/#/devops/introduction?id=瀑布式流程)

![img](./7基于Kubernetes的DevOps平台实践.assets/devops-waterfall.jpg)

```text
瀑布模型:
  需求确立
    -> 开发(数周/数月一次性开发完)
    -> 交给 QA 测试
    -> 交给 运维 部署
  (阶段串行, 反馈慢)
```


前期需求确立之后，软件开发人员花费数周和数月编写代码，把所有需求一次性开发完，然后将代码交给QA（质量保障）团队进行测试，然后将最终的发布版交给运维团队去部署。瀑布模型，简单来说，就是等一个阶段所有工作完成之后，再进入下一个阶段。这种模式的问题也很明显，产品迭代周期长，灵活性差。一个周期动辄几周几个月，适应不了当下产品需要快速迭代的场景。

##### [敏捷开发](http://49.7.203.222:2023/#/devops/introduction?id=敏捷开发)

![img](./7基于Kubernetes的DevOps平台实践.assets/devops-agile.jpg)

```text
敏捷开发:
  任务由大拆小
  开发 / 测试 协同(小步快跑)
  注重 开发敏捷, 不重视 交付敏捷
```


任务由大拆小，开发、测试协同工作，注重开发敏捷，不重视交付敏捷

##### [DevOps](http://49.7.203.222:2023/#/devops/introduction?id=devops)

![img](./7基于Kubernetes的DevOps平台实践.assets/devops-compire.jpg)

```text
DevOps:
  开发 / 测试 / 运维 协同工作
  持续开发 + 持续交付 (CI/CD)
  打破部门墙, 自动化流转
```


开发、测试、运维协同工作, 持续开发+持续交付。

我们是否可以认为DevOps = 提倡开发、测试、运维协同工作来实现持续开发、持续交付的一种软件交付模式？

大家想一下为什么最初的开发模式没有直接进入DevOps的时代？

原因是：沟通成本。

各角色人员去沟通协作的时候都是手动去做，交流靠嘴，靠人去指挥，很显然会出大问题。所以说不能认为DevOps就是一种交付模式，因为解决不了沟通协作成本，这种模式就不具备可落地性。

那DevOps时代如何解决角色之间的成本问题？DevOps的核心就是自动化。自动化的能力靠什么来支撑，工具和技术。

DevOps工具链

![img](./7基于Kubernetes的DevOps平台实践.assets/devops-tools.jpg)

```text
DevOps 工具链(实现自动化, 降低协作成本):
  代码: GitLab      构建/CI: Jenkins
  制品: Harbor      部署: Kubernetes
  监控: Prometheus / EFK   质量: SonarQube
```


靠这些工具和技术，才实现了自动化流程，进而解决了协作成本，使得devops具备了可落地性。因此我们可以大致给devops一个定义：

devops = 提倡开发、测试、运维协同工作来实现持续开发、持续交付的一种软件交付模式 + 基于工具和技术支撑的自动化流程的落地实践。

因此devops不是某一个具体的技术，而是一种思想+自动化能力，来使得构建、测试、发布软件能够更加地便捷、频繁和可靠的落地实践。本次课程核心内容就是要教会大家如何利用工具和技术来实现完整的DevOps平台的建设。我们主要使用的工具有：

1. gitlab，代码仓库，企业内部使用最多的代码版本管理工具。
2. Jenkins， 一个可扩展的持续集成引擎，用于自动化各种任务，包括构建、测试和部署软件。
3. robotFramework， 基于Python的自动化测试框架
4. sonarqube，代码质量管理平台
5. maven，java包构建管理工具
6. Kubernetes
7. Docker



# K8S中安装配置Jenkins

##### Kubernetes环境中部署jenkins

[其他部署方式](https://jenkins.io/zh/doc/book/installing/)

注意点：

1. 第一次启动很慢
2. 因为后面Jenkins会与kubernetes集群进行集成，会需要调用kubernetes集群的api，因此安装的时候创建了ServiceAccount并赋予了cluster-admin的权限
3. 初始化容器来设置权限
4. ingress来外部访问
5. 数据存储通过pvc挂载到宿主机中

```
mkdir -p ~/jenkins;cd ~/jenkins
cat <<\EOF > jenkins-all.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: jenkins
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: jenkins
  namespace: jenkins
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: nfs
  resources:
    requests:
      storage: 200Gi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: jenkins
  namespace: jenkins
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: jenkins-crb
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: jenkins
  namespace: jenkins
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jenkins-master
  namespace: jenkins
spec:
  replicas: 1
  selector:
    matchLabels:
      devops: jenkins-master
  template:
    metadata:
      labels:
        devops: jenkins-master
    spec:
      serviceAccount: jenkins #Pod 需要使用的服务账号
      initContainers:
      - name: fix-permissions
        image: busybox
        command: ["sh", "-c", "chown -R 1000:1000 /var/jenkins_home"]
        securityContext:
          privileged: true
        volumeMounts:
        - name: jenkinshome
          mountPath: /var/jenkins_home
      containers:
      - name: jenkins
        image: jenkins/jenkins:2.482-slim-jdk17
        imagePullPolicy: IfNotPresent
        ports:
        - name: http #Jenkins Master Web 服务端口
          containerPort: 8080
        - name: slavelistener #Jenkins Master 供未来 Slave 连接的端口
          containerPort: 50000
        volumeMounts:
        - name: jenkinshome
          mountPath: /var/jenkins_home
        env:
        - name: JAVA_OPTS
          value: "-Xms4096m -Xmx5120m -Duser.timezone=Asia/Shanghai -Dhudson.model.DirectoryBrowserSupport.CSP="
      volumes:
      - name: jenkinshome
        persistentVolumeClaim:
          claimName: jenkins
---
apiVersion: v1
kind: Service
metadata:
  name: jenkins
  namespace: jenkins
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  - name: slavelistener
    port: 50000
    targetPort: 50000
  type: ClusterIP
  selector:
    devops: jenkins-master
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jenkins-web
  namespace: jenkins
spec:
  ingressClassName: nginx #注意这个不能少,否则不会加载到ingrss-nginx-controller容器配置里
  rules:
  - host: jenkins.luffy.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service: 
            name: jenkins
            port:
              number: 8080
EOF


# 实验环境 java虚拟机内存给小点， jenkins总是崩溃 增加-XX:PermSize=256M 参数
 value: "-Xms512m -Xmx1024m -XX:PermSize=256M -Duser.timezone=Asia/Shanghai -Dhudson.model.DirectoryBrowserSupport.CSP="
注意：这里的几个 JVM 参数含义如下：
-Xms: 使用的最小堆内存大小
-Xmx: 使用的最大堆内存大小
-XX：内存的永久保存区域大小
这几个参数也不是配置越大越好，具体要根据所在机器实际内存和使用大小配置。

 -XX:PermSize=256M 官方的最新版不认识这个参数.
 
 # 这里jenkins 镜像随着时间推移,版本可能需要更新版本
 https://docker.aityp.com/  #国内镜像版本查看
```

创建服务：

```bash
## 部署服务
kubectl create -f jenkins-all.yaml
## 查看服务
kubectl -n jenkins get po
NAME                              READY   STATUS    RESTARTS   AGE
jenkins-master-767df9b574-lgdr5   1/1     Running   0          20s

# 查看日志，第一次启动提示需要完成初始化设置
$ kubectl -n jenkins logs -f jenkins-master-767df9b574-lgdr5
......
*************************************************************

Jenkins initial setup is required. An admin user has been created and a password generated.
Please use the following password to proceed to installation:

7e92d836d52d41839b7e3c7800f2bc36

This may also be found at: /var/jenkins_home/secrets/initialAdminPassword

 
*************************************************************
```

访问服务：

配置hosts解析，`172.16.1.226 jenkins.luffy.com`，然后使用浏览器域名访问服务。第一次访问需要大概几分钟的初始化时间。

![img](./7基于Kubernetes的DevOps平台实践.assets/jenkins_setup.jpg)

```text
Jenkins 初始化:
  1. 配置 hosts: 172.16.1.226 jenkins.luffy.com
  2. 浏览器域名访问, 首次需几分钟初始化
  3. 用启动日志中的管理员密码解锁
```


使用jenkins启动日志中的密码，或者执行下面的命令获取解锁的管理员密码：

```bash
$ kubectl -n jenkins exec  -ti jenkins-master-57fc5c84c7-ftd68 -- bash
/ # cat /var/jenkins_home/secrets/initialAdminPassword
35b083de1d25409eaef57255e0da481a
```

点击叉号，跳过选择安装推荐的插件环节，直接进入Jenkins。由于默认的插件地址安装非常慢，我们可以替换成国内清华的源，进入 jenkins 工作目录，目录下面有一个 `updates` 的目录，下面有一个 `default.json` 文件，我们执行下面的命令替换插件地址：

```bash
$ cd /var/jenkins_home/updates
sed -i 's/http:\/\/updates.jenkins-ci.org\/download/https:\/\/mirrors.tuna.tsinghua.edu.cn\/jenkins/g' default.json 
sed -i 's/http:\/\/www.google.com/https:\/\/www.baidu.com/g' default.json
```

配置升级站点的URL:

```bash
# http://jenkins.luffy.com/pluginManager/advanced
#Plugin Manager->Advanced，最后一项URL替换为:

https://mirrors.tuna.tsinghua.edu.cn/jenkins/updates/update-center.json

```



选择右上角admin->configure->password重新设置管理员密码，设置完后，会退出要求重新登录，使用admin/xxxxxx(新密码)，登录即可。

![img](./7基于Kubernetes的DevOps平台实践.assets/jenkins-mainpage.jpg)

```text
Jenkins 主页面:
  admin -> configure -> password 重设管理员密码
  改完退出重新登录(admin / 新密码)
  提示: 访问 /restart 重启使国内插件生效
```


> 注意: 此时访问 http://jenkins.luffy.com/restart   重启一次jenkins,使国内插件生效!

##### [安装汉化插件](http://49.7.203.222:2023/#/devops/install?id=安装汉化插件)

Jenkins -> manage Jenkins -> Plugin Manager -> Avaliable，搜索 `chinese`关键字

安装的插件 

GitLab Plugin 

Pipeline: Multibranch

Blue Ocean 

Localization: Chinese (Simplified)



![img](./7基于Kubernetes的DevOps平台实践.assets/jenkins-install-plugins.jpg)

```text
安装汉化插件:
  Manage Jenkins -> Manage Plugins
  安装 Locale / 中文社区插件
  (实现 Jenkins 界面汉化)
```




选中后，选择[Install without restart]，等待下载完成，然后点击[ Restart Jenkins when installation is complete and no jobs are running ]，让Jenkins自动重启

启动后，界面默认变成中文。



# [Jenkins基本使用演示](http://49.7.203.222:2023/#/devops/basic-usage?id=jenkins基本使用演示)

###### [演示目标](http://49.7.203.222:2023/#/devops/basic-usage?id=演示目标)

- 代码提交gitlab，自动触发Jenkins任务
- Jenkins任务完成后发送钉钉消息通知

###### 演示准备 - gitlab

*gitlab代码仓库搭建*

https://github.com/sameersbn/docker-gitlab

```bash
## 全量部署的组件
$ gitlab-ctl status
run: alertmanager: (pid 1987) 27s; run: log: (pid 1986) 27s
run: gitaly: (pid 1950) 28s; run: log: (pid 1949) 28s
run: gitlab-exporter: (pid 1985) 27s; run: log: (pid 1984) 27s
run: gitlab-workhorse: (pid 1956) 28s; run: log: (pid 1955) 28s
run: logrotate: (pid 1960) 28s; run: log: (pid 1959) 28s
run: nginx: (pid 2439) 1s; run: log: (pid 1990) 27s
run: node-exporter: (pid 1963) 28s; run: log: (pid 1962) 28s
run: postgres-exporter: (pid 1989) 27s; run: log: (pid 1988) 27s
run: postgresql: (pid 1945) 28s; run: log: (pid 1944) 28s
run: prometheus: (pid 1973) 28s; run: log: (pid 1972) 28s
run: puma: (pid 1968) 28s; run: log: (pid 1966) 28s
run: redis: (pid 1952) 28s; run: log: (pid 1951) 28s
run: redis-exporter: (pid 1971) 28s; run: log: (pid 1964) 28s
run: sidekiq: (pid 1969) 28s; run: log: (pid 1967) 28s
```

部署分析：

1. 依赖postgres
2. 依赖redis

使用k8s部署：

1. 准备secret文件

    ```bash
    cat <<\EOF >gitlab-secret.txt
    postgres.user.root=root
    postgres.pwd.root=cm9vdA==
    EOF
   
    kubectl -n jenkins create secret generic gitlab-secret --from-env-file=gitlab-secret.txt
   
    -----------------------
    # echo -n root|base64
    cm9vdA==
    # echo -n cm9vdA==|base64 -d
    root
    ```

2. 部署postgres

   注意点：

   - 使用secret来引用账户密码

```bash
cat <<\EOF > postgres.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    app: postgres
  namespace: jenkins
spec:
  ports:
  - name: server
    port: 5432
    targetPort: 5432
    protocol: TCP
  selector:
    app: postgres
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: postgredb
  namespace: jenkins
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: nfs
  resources:
    requests:
      storage: 200Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: jenkins
  name: postgres
  labels:
    app: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      tolerations:
      - operator: "Exists"
      containers:
      - name: postgres
        image: postgres:11.4
        imagePullPolicy: "IfNotPresent"
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER           #PostgreSQL 用户名
          valueFrom:
            secretKeyRef:
              name: gitlab-secret
              key: postgres.user.root
        - name: POSTGRES_PASSWORD       #PostgreSQL 密码
          valueFrom:
            secretKeyRef:
              name: gitlab-secret
              key: postgres.pwd.root
        resources:
          limits:
            cpu: 1000m
            memory: 2048Mi
          requests:
            cpu: 50m
            memory: 100Mi
        volumeMounts:
        - mountPath: /var/lib/postgresql/data
          name: postgredb
      volumes:
      - name: postgredb
        persistentVolumeClaim:
          claimName: postgredb
EOF
# 实验环境资源调整
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 50m
            memory: 100Mi

#创建postgres
kubectl create -f postgres.yaml
   
# 创建数据库gitlab,为后面部署gitlab组件使用
# kubectl -n jenkins exec -ti postgres-7ff9b49f4c-nt8zh -- bash
root@postgres-7ff9b49f4c-nt8zh:/# psql
root=# create database gitlab;
CREATE DATABASE

```

1. 部署redis

    ```bash
    cat <<\EOF >redis.yaml
    apiVersion: v1
    kind: Service
    metadata:
      name: redis
      labels:
        app: redis
      namespace: jenkins
    spec:
      ports:
      - name: server
        port: 6379
        targetPort: 6379
        protocol: TCP
      selector:
        app: redis
    ---
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      namespace: jenkins
      name: redis
      labels:
        app: redis
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: redis
      template:
        metadata:
          labels:
            app: redis
        spec:
          tolerations:
          - operator: "Exists"
          containers:
          - name: redis
            image: sameersbn/redis:4.0.9-2
            imagePullPolicy: "IfNotPresent"
            ports:
            - containerPort: 6379
            resources:
              limits:
                cpu: 1000m
                memory: 2048Mi
              requests:
                cpu: 50m
                memory: 100Mi
    EOF
    # 实验环境资源调整
            resources:
              limits:
                cpu: 200m
                memory: 256Mi
              requests:
                cpu: 50m
                memory: 50Mi
               
    # 创建
    kubectl create -f redis.yaml
    ```

2. 部署gitlab

   注意点：

   - 使用ingress暴漏服务
   - 添加annotation，指定nginx端上传大小限制，否则推送代码时会默认被限制1m大小，相当于给nginx设置client_max_body_size的限制大小
   - 使用服务发现地址来访问postgres和redis
   - 在secret中引用数据库账户和密码
   - 数据库名称为gitlab

```bash
# kubectl -n jenkins get po
# kubectl -n jenkins logs -f postgres-xxxx
# kubectl -n jenkins exec -ti postgres-xxx -- bash
---# psql
---# create database gitlab;
---# \l
---# exit

cat <<\EOF > gitlab.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gitlab
  namespace: jenkins
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  ingressClassName: nginx
  rules:
  - host: gitlab.luffy.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gitlab
            port:
              number: 80
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: gitlab
  namespace: jenkins
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: nfs
  resources:
    requests:
      storage: 200Gi
---
apiVersion: v1
kind: Service
metadata:
  name: gitlab
  labels:
    app: gitlab
  namespace: jenkins
spec:
  ports:
  - name: server
    port: 80
    targetPort: 80
    protocol: TCP
  selector:
    app: gitlab
---
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: jenkins
  name: gitlab
  labels:
    app: gitlab
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gitlab
  template:
    metadata:
      labels:
        app: gitlab
    spec:
      nodeName: k8s-slave2  #指定部署到的节点
      tolerations:
      - operator: "Exists"
      containers:
      - name: gitlab
        image:  sameersbn/gitlab:13.2.2
        imagePullPolicy: "IfNotPresent"
        env:
        - name: GITLAB_HOST
          value: "gitlab.luffy.com"
        - name: GITLAB_PORT
          value: "80"
        - name: GITLAB_SECRETS_DB_KEY_BASE
          value: "long-and-random-alpha-numeric-string"
        - name: GITLAB_SECRETS_SECRET_KEY_BASE
          value: "long-and-random-alpha-numeric-string"
        - name: GITLAB_SECRETS_OTP_KEY_BASE
          value: "long-and-random-alpha-numeric-string"
        - name: DB_HOST
          value: "postgres"
        - name: DB_NAME
          value: "gitlab"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: gitlab-secret
              key: postgres.user.root
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: gitlab-secret
              key: postgres.pwd.root
        - name: REDIS_HOST
          value: "redis"
        - name: REDIS_PORT
          value: "6379"
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: 2000m
            memory: 5048Mi
          requests:
            cpu: 100m
            memory: 500Mi
        volumeMounts:
        - mountPath: /home/git/data
          name: data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: gitlab
EOF
# 实验环境可以适当给小资源
        resources:
          limits:
            cpu: 1000m
            memory: 2048Mi  #这里要给2G 不然网页反应慢
          requests:
            cpu: 800m
            memory: 500Mi

# 添加指定节点
    spec: #定位
      nodeSelector:   # 使用节点选择器将Pod调度到指定label的节点
        component: gitlab
## 为节点打标签   在master上执行就可以
$ kubectl label node k8s-slave2 component=gitlab


执行 kubectl explain deployment.spec.<field_name>。如果该字段在当前版本中受支持，命令会显示该字段的详细说明；如果不支持，可能会显示错误信息或没有相应的输出。


# 查看官方文档,可以使用 
# https://v1-27.docs.kubernetes.io/zh-cn/docs/tasks/configure-pod-container/assign-pods-nodes/
nodeName: k8s-slave2  #指定部署到的节点
--------------------
          
# 创建
kubectl create -f gitlab.yaml
```

配置hosts解析：

```bash
172.16.1.226 gitlab.luffy.com
```

*设置root密码*

访问[http://gitlab.luffy.com，设置管理员密码]  root  Admin@123.com

*配置k8s-master节点的hosts*

```bash
$ echo "172.16.1.226 gitlab.luffy.com" >>/etc/hosts
```

* eladmin-api项目推送到gitlab*

```bash
---------------- 把本地代码推送到gitlab
登录gitlab  root  Admin@123.com
创建一个group  name: eladmin  -->  组内创建一个项目 eladmin-api

# git clone https://gitee.com/chengkanghua/eladmin.git


git config --global user.name "Administrator"
git config --global user.email "admin@example.com"

# Push an existing Git repository
cd eladmin
git remote rename origin old-origin
git remote add origin http://gitlab.luffy.com/eladmin/eladmin-api.git
git push -u origin --all  #根据提示输入账号密码 root  Admin@123.com 
# git push -u origin --tags

# git remote -v #查看远程仓库地址

#gitlab 默认的 auto DevOps    关闭 Default to Auto DevOps pipeline 勾选去掉
# http://gitlab.luffy.com/eladmin/eladmin-api/-/settings/ci_cd
```

*钉钉推送*

[官方文档](https://ding-doc.dingtalk.com/doc#/serverapi2/qf2nxq)

- 配置机器人

- 试验发送消息

    ```bash
    $ curl 'https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744' \
       -H 'Content-Type: application/json' \
       -d '{"msgtype": "text", 
            "text": {
                 "content": "我就是我, 是不一样的烟火"
            }
          }'
        
    #钉钉群 设置 --》 智能群助手 -》机器人管理---》 自定义
    https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744
    ```

###### [演示过程](http://49.7.203.222:2023/#/devops/basic-usage?id=演示过程)

流程示意图：

![img](./7基于Kubernetes的DevOps平台实践.assets/jenkins-gitlab.png)

```text
Jenkins + GitLab 集成流程:
  开发者 push 代码 -> GitLab
        |
        v  webhook 触发
   Jenkins 拉取代码 -> 构建/测试
        |
        v
   构建结果通知(钉钉 / GitLab 状态)
```


1. 安装gitlab plugin

   插件中心搜索并安装gitlab，直接安装即可

2. 配置Gitlab

   系统管理->系统配置->Gitlab，其中的API Token，需要从下个步骤中获取

   ![img](./7基于Kubernetes的DevOps平台实践.assets/gitlab-connection.jpg)

```text
Jenkins 连接 GitLab:
  系统管理 -> 系统配置 -> GitLab
  填入 API Token(来自 GitLab Personal Access Token)
  Credentials: 添加该 Token
  (Test Connection 验证)
```


   Credentials: 添加

![image-20241026125356951](./7基于Kubernetes的DevOps平台实践.assets/image-20241026125356951.png)

```text
添加 Jenkins Credentials:
  类型: GitLab API Token
  Scope: 全局
  API Token: <GitLab Personal Access Token>
  (供 Jenkins 调用 GitLab API)
```


3. 获取AccessToken

登录gitlab，选择user->Settings->access tokens新建一个访问token

http://gitlab.luffy.com/profile/personal_access_tokens

![image-20241026124824021](./7基于Kubernetes的DevOps平台实践.assets/image-20241026124824021.png)

```text
获取 GitLab AccessToken:
  访问 .../profile/personal_access_tokens
  勾选 api / read_user / write_repository 等 scope
  生成 token 并复制到 Jenkins
```




```bash
复制gitlab token #Your new personal access token
v37Evs6VmTYLFzTifXRV
```

> 注意: 这里test conntection 不成功,是要做host解析, 按下一步操作

4. 配置host解析

由于我们的Jenkins和gitlab域名是本地解析，因此需要让gitlab和Jenkins服务可以解析到对方的域名。两种方式：

- 在容器内配置hosts

- 配置coredns的静态解析  | 推荐这种方式

    ```bash
  
    # kubectl -n kube-system edit cm coredns
    		ready #下面增加内容。定位
    		hosts {
                172.16.1.226 jenkins.luffy.com  gitlab.luffy.com
                fallthrough
            }
          
    # 重启coredns
    kubectl -n kube-system scale deployment coredns --replicas=0
    kubectl -n kube-system scale deployment coredns --replicas=1        
    ```

5. 创建自由风格项目    name : free-demo

- gitlab connection 选择为刚创建的gitlab    

- 源码管理选择Git，填项项目地址     `git@gitlab.luffy.com:eladmin/eladmin-api.git`

- 新建一个 Credentials 认证，使用用户名密码方式，配置gitlab的用户和密码

    ```
    用户名: root  
    密码: Admin@123.com
  
    ID : gitlab-user
    ```

  

- 构建触发器选择 Build when a change is pushed to GitLab  #复制url 

  - 生成一个Secret token

  - 保存


6. 到gitlab配置webhook

- 进入项目下settings->Integrations
- URL： http://jenkins.luffy.com/project/free-demo
- Secret Token 填入在Jenkins端生成的token
- Add webhook
- test push events，报错：Requests to the local network are not allowed

7. 设置gitlab允许向本地网络发送webhook请求

访问 Admin Aera -> Settings -> Network ，展开Outbound requests -->Allow requests to the local network from web hooks and services   打勾 保存

设置地址参考: http://gitlab.luffy.com/admin/application_settings/network

Collapse，勾选第一项即可。再次test push events，成功。

![img](./7基于Kubernetes的DevOps平台实践.assets/gitlab-webhook-success.jpg)

```text
GitLab Webhook 测试:
  项目 -> Settings -> Webhooks
  URL 指向 Jenkins 构建触发地址
  Test -> Push events -> 返回 200 / Hook executed successfully
```


8. 配置free项目，增加构建步骤，执行shell，将发送钉钉消息的shell保存

```bash
curl 'https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744' \
   -H 'Content-Type: application/json' \
   -d '{"msgtype": "text","text": {"content": "我就是我, 是不一样的烟火"}}'

```



9.提交代码到gitlab仓库，查看构建是否自动执行

```bash
$ git clone http://gitlab.luffy.com/eladmin/eladmin-api.git
$ cd eladmin
$ touch test.log
$ git add .
$ git commit -m "touch test"
$ git push -u origin master

```





# Master-Slave模式



##### [Master-Slaves（agent）模式](http://49.7.203.222:2023/#/devops/master-slaves?id=master-slaves（agent）模式)

上面演示的任务，默认都是在master节点执行的，多个任务都在master节点执行，对master节点的性能会造成一定影响，如何将任务分散到不同的节点，做成多slave的方式？

1. 添加slave节点

    - 系统管理 -> 节点管理 -> 新建节点  名字: 另一个节点ip 172.16.1.228
    - 比如添加172.16.1.228，选择固定节点，保存   
    - 远程工作目录/opt/jenkins_jobs
    - 标签为任务选择节点的依据，如172.16.1.228
    - 启动方式选择通过java web启动代理，代理是运行jar包，通过JNLP（是一种允许客户端启动托管在远程Web服务器上的应用程序的协议 ）启动连接到master节点服务中

    ![img](./7基于Kubernetes的DevOps平台实践.assets/jenkins-new-node.jpg)

```text
新建 Jenkins 节点(Master-Slaves):
  节点名: 如 172.16.1.228
  标签: 任务选择节点的依据
  启动方式: 通过 Java Web 启动代理(JNLP)
  (agent 运行 jar 包连接 master)
```


    保存之后根据提示操作

    ```bash
    # Run from agent command line: (Unix) 
    curl -sO http://jenkins.luffy.com/jnlpJars/agent.jar
    java -jar agent.jar -url http://jenkins.luffy.com/ -secret 72a9b018e2079b60626998f75c7545d16226ccac113568a5b8707fb82f657905 -name "172.16.1.228" -webSocket -workDir "/opt/jenkins_jobs"
   
   
    # Or run from agent command line, with the secret stored in a file: (Unix)
    echo 72a9b018e2079b60626998f75c7545d16226ccac113568a5b8707fb82f657905 > secret-file
    curl -sO http://jenkins.luffy.com/jnlpJars/agent.jar
    java -jar agent.jar -url http://jenkins.luffy.com/ -secret @secret-file -name "172.16.1.228" -webSocket -workDir "/opt/jenkins_jobs"
    ```

   

2. 执行java命令启动agent服务

    ```bash
    # jenkins服务器装的是jdk17, 所有slave服务器也要安装相同版本
    # openjdk 17 版本下载地址
    https://www.openlogic.com/openjdk-downloads?page=4
    https://developers.redhat.com/products/openjdk/download   #需要登录,user:chengkanghua
   
    # wget https://builds.openlogic.com/downloadJDK/openlogic-openjdk/17.0.12+7/openlogic-openjdk-17.0.12+7-linux-x64-el.rpm
   
    mkdir /application
    cd /application/
    wget https://access.cdn.redhat.com/content/origin/files/sha256/1e/1efd7499e00e7efb419301c76f6be9815645091b08ecd8a19596f787a734f8bd/java-17-openjdk-17.0.13.0.11-1.portable.jdk.el.x86_64.tar.xz?_auth_=1729943988_564c7931838653686f00c7c8a21d0198
   
    tar xf java-17-openjdk-17.0.13.0.11-1.portable.jdk.el.x86_64.tar.xz
   
    ln -s /application/java-17-openjdk-17.0.13.0.11-1.portable.jdk.el.x86_64/bin/java /usr/bin/java
    java -version
   
   
    # vi /etc/hosts
    172.16.1.226 k8s-master jenkins.luffy.com gitlab.luffy.com
   
   
    wget http://jenkins.luffy.com/jnlpJars/agent.jar
    java -jar agent.jar -url http://jenkins.luffy.com/ -secret 72a9b018e2079b60626998f75c7545d16226ccac113568a5b8707fb82f657905 -name "172.16.1.228" -webSocket -workDir "/opt/jenkins_jobs"
   
    # 提示 INFO: Connected , 页面上查看连接状态
   
    # 注意 需要安装git,  
    yum install -y git
   
    ```

    若出现如下错误:

    ```bash
    SEVERE: http://jenkins.luffy.com/ provided port:50000 is not reachable
    java.io.IOException: http://jenkins.luffy.com/ provided port:50000 is not reachable
            at org.jenkinsci.remoting.engine.JnlpAgentEndpointResolver.resolve(JnlpAgentEndpointResolver.java:311)
            at hudson.remoting.Engine.innerRun(Engine.java:689)
            at hudson.remoting.Engine.run(Engine.java:514)
    ```

    可以选择： 配置从节点 -> 高级 -> Tunnel连接位置，参考下图进行设置:

    ![img](./7基于Kubernetes的DevOps平台实践.assets/slave-tunnel.jpg)

```text
从节点 Tunnel 配置:
  配置从节点 -> 高级 -> Tunnel 连接位置
  (指定 master 的 JNLP 端口隧道, 穿透网络)
```


3. 查看Jenkins节点列表，新节点已经处于可用状态

   ![img](./7基于Kubernetes的DevOps平台实践.assets/jenkins-node-lists.jpg)

```text
节点列表:
  新节点已处于 可用(Online) 状态
  (可在任务中通过标签指定该节点执行)
```


4. 测试使用新节点执行任务

   - 配置free-demo项目

   - 限制项目的运行节点 ，标签表达式选择172.16.1.228

   - 立即构建

   - 查看构建日志

     ```bash
     Started by user admin
     Running as SYSTEM
     Building remotely on 172.16.1.228 in workspace /opt/jenkins_jobs/workspace/free-demo
     using credential gitlab-user
     Cloning the remote Git repository
     Cloning repository http://gitlab.luffy.com/root/myblog.git
      > git init /opt/jenkins_jobs/workspace/free-demo # timeout=10
      ...
     ```



# [Jenkins定制化容器](http://49.7.203.222:2023/#/devops/customize?id=jenkins定制化容器)

由于每次新部署Jenkins环境，均需要安装很多必要的插件，因此考虑把插件提前做到镜像中

*Dockerfile*

```dockerfile
# jenkins:2.482-slim-jdk17  #这个版本有空再试试
cat <<\EOF >Dockerfile
FROM jenkins/jenkins:2.482
LABEL maintainer="inspur_lyx@hotmail.com"

ENV JENKINS_UC https://mirrors.tuna.tsinghua.edu.cn/jenkins/updates
ENV JENKINS_UC https://updates.jenkins-zh.cn
ENV JENKINS_UC_DOWNLOAD https://mirrors.tuna.tsinghua.edu.cn/jenkins
ENV JENKINS_OPTS="-Dhudson.model.UpdateCenter.updateCenterUrl=https://updates.jenkins-zh.cn/update-center.json"
ENV JENKINS_OPTS="-Djenkins.install.runSetupWizard=false"

## 用最新的插件列表文件替换默认插件文件
COPY plugins.txt /usr/share/jenkins/ref/

## 执行插件安装
RUN /usr/local/bin/install-plugins.sh < /usr/share/jenkins/ref/plugins.txt
EOF

# 新版容器里已经没有了install-plugins.sh
# https://github.com/jenkinsci/docker/blob/master/jenkins-plugin-cli.sh
wget https://raw.githubusercontent.com/jenkinsci/docker/refs/heads/master/jenkins-plugin-cli.sh

# 修改后完整版
cat <<\EOF >Dockerfile
FROM jenkins/jenkins:2.482
LABEL maintainer="inspur_lyx@hotmail.com"
USER root

ENV JENKINS_UC https://mirrors.tuna.tsinghua.edu.cn/jenkins/updates
ENV JENKINS_UC_DOWNLOAD https://mirrors.tuna.tsinghua.edu.cn/jenkins
ENV JENKINS_OPTS="-Dhudson.model.UpdateCenter.updateCenterUrl=https://updates.jenkins-zh.cn/update-center.json"
ENV JENKINS_OPTS="-Djenkins.install.runSetupWizard=false"

## 用最新的插件列表文件替换默认插件文件
COPY plugins.txt /usr/share/jenkins/ref/
ADD https://gitee.com/chengkanghua/script/raw/master/k8s/jenkins-plugin-cli.sh /usr/local/bin/
## 执行插件安装
RUN chmod +x /usr/local/bin/jenkins-plugin-cli.sh && /usr/local/bin/jenkins-plugin-cli.sh -f /usr/share/jenkins/ref/plugins.txt
EOF

```

*plugins.txt*

```python
ace-editor:1.1
allure-jenkins-plugin:2.28.1
ant:1.10
antisamy-markup-formatter:1.6
apache-httpcomponents-client-4-api:4.5.10-1.0
authentication-tokens:1.3
...
```

*get_plugin.sh*

> admin:123456@localhost 需要替换成Jenkins的用户名、密码及访问地址

```bash
#先配置好 etc/hosts ;  jennkins容器ip  jenkins.luffy.com
#!/usr/bin/env bash
curl -sSL  "http://admin:admin@jenkins.luffy.com/pluginManager/api/xml?depth=1&xpath=/*/*/shortName|/*/*/version&wrapper=plugins" | perl -pe 's/.*?<shortName>([\w-]+).*?<version>([^<]+)()(<\/\w+>)+/\1:\2\n/g'|sed 's/ /:/' > plugins.txt

## 执行构建，定制jenkins容器
$ docker build . -t 172.16.1.226:5000/jenkins:v20241025 -f Dockerfile
$ docker push 172.16.1.226:5000/jenkins:v20241025
```

至此，我们可以使用定制化的镜像启动jenkins服务

```bash
## 删掉当前服务
$ kubectl delete -f jenkins-all.yaml

## 删掉已挂载的数据
$ rm -rf /var/jenkins_home

## 替换使用定制化镜像
$ sed -i 's#jenkinsci/blueocean#172.16.1.226:5000/jenkins:v20200404#g' jenkins-all.yaml

## 重新创建服务
$ kubectl create -f jenkins-all.yaml
```

##### [本章小结](http://49.7.203.222:2023/#/devops/customize?id=本章小结)

自由风格项目弊端：

- 任务的完成需要在Jenkins端维护大量的配置
- 没法做版本控制
- 可读性、可移植性很差，不够优雅



# 流水线语法

#### [流水线入门](http://49.7.203.222:2023/#/devops/pipeline-gram?id=流水线入门)

![img](./7基于Kubernetes的DevOps平台实践.assets/pipeline-factory.jpeg)

```text
流水线(Pipeline):
  Jenkinsfile 定义 构建->测试->部署 全流程
  像工厂生产线: 源码 -> ... -> 发布线上
  (代码即流水线, 可版本化)
```


[官方文档](https://jenkins.io/zh/doc/book/pipeline/getting-started/)

![img](./7基于Kubernetes的DevOps平台实践.assets/realworld-pipeline-flow.png)

```text
真实流水线流程:
  SCM(代码) -> 构建(Build) -> 测试(Test)
     -> 打包/镜像 -> 部署(Deploy) -> 线上环境
  (pipeline 贯穿 源码 到 发布)
```


为什么叫做流水线，和工厂产品的生产线类似，pipeline是从源码到发布到线上环境。关于流水线，需要知道的几个点：

- 重要的功能插件，帮助Jenkins定义了一套工作流框架；
- Pipeline 的实现方式是一套 Groovy DSL（ 领域专用语言 ），所有的发布流程都可以表述为一段 Groovy 脚本；
- 将WebUI上需要定义的任务，以脚本代码的方式表述出来；
- 帮助jenkins实现持续集成CI（Continue Integration）和持续部署CD（Continue Deliver）的重要手段；

##### [流水线基础语法](http://49.7.203.222:2023/#/devops/pipeline-gram?id=流水线基础语法)

[官方文档](https://jenkins.io/zh/doc/book/pipeline/syntax/)

两种语法类型：

- Scripted Pipeline，脚本式流水线，最初支持的类型
- Declarative Pipeline，声明式流水线，为Pipeline plugin在2.5版本之后新增的一种脚本类型，后续Open Blue Ocean所支持的类型。与原先的Scripted Pipeline一样，都可以用来编写脚本。Declarative Pipeline 是后续Open Blue Ocean所支持的类型，写法简单，支持内嵌Scripted Pipeline代码

*为与BlueOcean脚本编辑器兼容，通常建议使用Declarative Pipeline的方式进行编写,从jenkins社区的动向来看，很明显这种语法结构也会是未来的趋势。*

###### [脚本示例](http://49.7.203.222:2023/#/devops/pipeline-gram?id=脚本示例)

```json
pipeline { 
    agent {label '172.16.1.228'}
    environment { 
        PROJECT = 'eladmin-api'
    }
    stages {
        stage('Checkout') { 
            steps { 
                checkout scm 
            }
        }
        stage('Build') { 
            steps { 
                sh 'make' 
            }
        }
        stage('Test'){
            steps {
                sh 'make check'
                junit 'reports/**/*.xml' 
            }
        }
        stage('Deploy') {
            steps {
                sh 'make publish'
            }
        }
    }
    post {
        success { 
            echo 'Congratulations!'
        }
        failure { 
            echo 'Oh no!'
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}
```

###### [脚本解释：](http://49.7.203.222:2023/#/devops/pipeline-gram?id=脚本解释：)

- `checkout`步骤为检出代码; `scm`是一个特殊变量，指示`checkout`步骤克隆触发此Pipeline运行的特定修订

- agent：指明使用哪个agent节点来执行任务，定义于pipeline顶层或者stage内部

  - any，可以使用任意可用的agent来执行

  - label，在提供了标签的 Jenkins 环境中可用的代理上执行流水线或阶段。 例如: `agent { label 'my-defined-label' }`，最常见的使用方式

  - none，当在 `pipeline` 块的顶部没有全局代理， 该参数将会被分配到整个流水线的运行中并且每个 `stage` 部分都需要包含他自己的 `agent` 部分。比如: `agent none`

  - docker， 使用给定的容器执行流水线或阶段。 在指定的节点中，通过运行容器来执行任务

    ```json
    agent {
        docker {
            image 'maven:3-alpine'
            label 'my-defined-label'
            args  '-v /tmp:/tmp'
        }
    }
    ```

- options: 允许从流水线内部配置特定于流水线的选项。

  - buildDiscarder , 为最近的流水线运行的特定数量保存组件和控制台输出。例如: `options { buildDiscarder(logRotator(numToKeepStr: '10')) }`
  - disableConcurrentBuilds ,不允许同时执行流水线。 可被用来防止同时访问共享资源等。 例如: `options { disableConcurrentBuilds() }`
  - timeout ,设置流水线运行的超时时间, 在此之后，Jenkins将中止流水线。例如: `options { timeout(time: 1, unit: 'HOURS') }`
  - retry，在失败时, 重新尝试整个流水线的指定次数。 For example: `options { retry(3) }`

- environment: 指令制定一个 键-值对序列，该序列将被定义为所有步骤的环境变量

- stages: 包含一系列一个或多个 [stage](https://jenkins.io/zh/doc/book/pipeline/syntax/#stage)指令, `stages` 部分是流水线描述的大部分"work" 的位置。 建议 `stages` 至少包含一个 [stage](https://jenkins.io/zh/doc/book/pipeline/syntax/#stage) 指令用于连续交付过程的每个离散部分,比如构建, 测试, 和部署。

    ```groovy
    pipeline {
        agent any
        stages { 
            stage('Example') {
                steps {
                    echo 'Hello World'
                }
            }
        }
    }
    ```

- steps: 在给定的 `stage` 指令中执行的定义了一系列的一个或多个[steps](https://jenkins.io/zh/doc/book/pipeline/syntax/#declarative-steps)。

- post: 定义一个或多个[steps](https://jenkins.io/zh/doc/book/pipeline/syntax/#declarative-steps) ，这些阶段根据流水线或阶段的完成情况而运行`post` 支持以下 [post-condition](https://jenkins.io/zh/doc/book/pipeline/syntax/#post-conditions) 块中的其中之一: `always`, `changed`, `failure`, `success`, `unstable`, 和 `aborted`。

  - always, 无论流水线或阶段的完成状态如何，都允许在 `post` 部分运行该步骤
  - changed, 当前流水线或阶段的完成状态与它之前的运行不同时，才允许在 `post` 部分运行该步骤
  - failure, 当前流水线或阶段的完成状态为"failure"，才允许在 `post` 部分运行该步骤, 通常web UI是红色
  - success, 当前流水线或阶段的完成状态为"success"，才允许在 `post` 部分运行该步骤, 通常web UI是蓝色或绿色
  - unstable, 当前流水线或阶段的完成状态为"unstable"，才允许在 `post` 部分运行该步骤, 通常由于测试失败,代码违规等造成。通常web UI是黄色
  - aborted， 只有当前流水线或阶段的完成状态为"aborted"，才允许在 `post` 部分运行该步骤, 通常由于流水线被手动的aborted。通常web UI是灰色

创建pipeline示意：

新建任务 -> 流水线     任务名字: eladmin-api-pipeline 

```bash
jenkins/pipelines/p1.yaml

pipeline {
   agent {label '172.16.1.228'}
   environment { 
      PROJECT = 'eladmin-api'
   }
   stages {
      stage('printenv') {
         steps {
            echo 'Hello World'
            sh 'printenv'
         }
      }
      stage('check') {
         steps {
            checkout scmGit(branches: [[name: '*/master']], extensions: [], userRemoteConfigs: [[credentialsId: '543cae0a-2f0c-4b12-bd0c-0ea4b6596726', url: 'http://gitlab.luffy.com/eladmin/eladmin-api.git']])
         }
      }
      stage('build-image') {
         steps {
            sh 'docker build . -t 172.16.1.226/eladmin/eladmin-api:latest -f Dockerfile'
         }
      }
      stage('send-msg') {
         steps {
            sh """
            curl 'https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744' \
   -H 'Content-Type: application/json' \
   -d '{"msgtype": "text", 
        "text": {
             "content": "我就是我, 是不一样的烟火"
        }
      }'
      """
         }
      }
   }
}


 # stage('check') 点击流水线语法,里选择chenckout: Check out from version control , 里填写,生成对用的脚本

 #在代码里添加Dockerfile文件
git clone http://gitlab.luffy.com/eladmin/eladmin-api.git
cd eladmin-api

cat > Dockerfile.multi <<EOF
FROM aerialist7/maven-git as builder
WORKDIR /opt/eladmin
COPY  . .
RUN mvn clean package

FROM java:8u111
WORKDIR /opt/eladmin
COPY --from=builder /opt/eladmin/eladmin-system/target/eladmin-system-2.6.jar .
CMD [ "sh", "-c", "java -Dspring.profiles.active=prod -jar eladmin-system-2.6.jar" ]
EOF

git add .
git commit -m "add Dockerfile.multi"
git push -u origin master

 
 
 -------------- 实际修改的版本
 pipeline {
   agent {label '172.16.1.228'}
   environment { 
      PROJECT = 'eladmin-api'
   }
   stages {
      stage('printenv') {
         steps {
            echo 'Hello World'
            sh 'printenv'
         }
      }
      stage('check') {
         steps {
            checkout scmGit(branches: [[name: '*/master']], extensions: [], userRemoteConfigs: [[credentialsId: '543cae0a-2f0c-4b12-bd0c-0ea4b6596726', url: 'http://gitlab.luffy.com/eladmin/eladmin-api.git']])
         }
      }
      stage('build-image') {
         steps {
            sh 'docker build . -t 172.16.1.226/eladmin/eladmin-api:latest -f Dockerfile.multi'
         }
      }

   }
   post {
        success { 
            echo 'Congratulations!'
        }
        failure { 
            echo 'Oh no!'
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
   
}



```

点击“立即构建”，同样的，我们可以配置触发器，使用webhook的方式接收项目的push事件，

- 构建触发器选择 Build when a change is pushed to GitLab.  #复制url地址, 
- 生成 Secret token    #复制token 
- 配置gitlab，创建webhook，(粘贴到创建webhook页面, ) , 发送test push events测试

###### [Blue Ocean:](http://49.7.203.222:2023/#/devops/pipeline-gram?id=blue-ocean)

[官方文档](https://jenkins.io/zh/doc/book/blueocean/getting-started/)

我们需要知道的几点：

- 是一个插件， 旨在为Pipeline提供丰富的体验 ；
- 连续交付（CD）Pipeline的复杂可视化，允许快速和直观地了解Pipeline的状态；
- 目前支持的类型仅针对于Pipeline，尚不能替代Jenkins 经典版UI

思考：

1. 每个项目都把大量的pipeline脚本写在Jenkins端，对于谁去维护及维护成本是一个问题
2. 没法做版本控制



# [Jenkinsflie实战](http://49.7.203.222:2023/#/devops/jenkinsfile-pratice?id=jenkinsflie)

Jenkins Pipeline 提供了一套可扩展的工具，用于将“简单到复杂”的交付流程实现为“持续交付即代码”。Jenkins Pipeline 的定义通常被写入到一个文本文件（称为 `Jenkinsfile` ）中，该文件可以被放入项目的源代码控制库中。

###### [演示1：使用Jenkinsfile管理**pipeline**](http://49.7.203.222:2023/#/devops/jenkinsfile-pratice?id=演示1：使用jenkinsfile管理pipeline)

- 在项目中源代码 新建Jenkinsfile文件，拷贝已有script内容 #上面--实际修改的版本
- 配置pipeline任务，流水线 定义为 Pipeline Script from SCM (scoure code manage 源代码管理)
- 执行push 代码测试

```bash
 ~/eladmin-api (master) $ vi Jenkinsfile
粘贴 已有script内容 #上面--实际修改的版本

git add .
git commit -m 'add Jenkinsfile'
git push -u origin master

#配置pipeline 流水线 定义为 Pipeline Script from SCM (scoure code manage 源代码管理)
regpossitory URL: http://gitlab.luffy.com/eladmin/eladmin-api.git
脚本路径 Jenkinsfile
```



Jenkinsfile:

```
jenkins/pipelines/p2.yaml

pipeline {
   agent {label '172.16.1.228'}
   environment { 
      PROJECT = 'eladmin-api'
   }
   stages {
      stage('printenv') {
         steps {
            echo 'Hello World'
            sh 'printenv'
         }
      }
      stage('check') {
         steps {
            checkout scmGit(branches: [[name: '*/master']], extensions: [], userRemoteConfigs: [[credentialsId: '543cae0a-2f0c-4b12-bd0c-0ea4b6596726', url: 'http://gitlab.luffy.com/eladmin/eladmin-api.git']])
         }
      }
      stage('build-image') {
         steps {
            sh 'docker build . -t 172.16.1.226/eladmin/eladmin-api:latest -f Dockerfile.multi'
         }
      }

   }
   post {
        success { 
            echo 'Congratulations!'
        }
        failure { 
            echo 'Oh no!'
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
   
}


```

###### [演示2：优化及丰富流水线内容](http://49.7.203.222:2023/#/devops/jenkinsfile-pratice?id=演示2：优化及丰富流水线内容)

- 优化代码检出阶段

  由于目前已经配置了使用git仓库地址，且使用SCM来检测项目，因此代码检出阶段完全没有必要再去指定一次

- 构建镜像的tag使用git的commit id

- 增加post阶段的消息通知，丰富通知内容,  钉钉工作群设置里-->机器人,-->设置 开启 webhook,  安全设置外网ip地址段;

- 编译和构建拆分不同的stage，增加构建速度

```
jenkins/pipelines/p3.yaml

-------实际修改的版本
 pipeline {
   agent {label '172.16.1.228'}
   environment { 
      PROJECT = 'eladmin-api'
   }
   stages {
      stage('printenv') {
         steps {
            echo 'Hello World'
            sh 'printenv'
         }
      }
      stage('check') {
         steps {
             checkout scm
         }
      }
      stage('mvn package') {
          steps {
            sh 'mvn clean package'
          }
        }
      stage('build-image') {
         steps {
            sh 'docker build . -t 172.16.1.226/eladmin/eladmin-api:${GIT_COMMIT} -f Dockerfile'
         }
      }

   }
   post {
        success { 
            echo 'Congratulations!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744' \
                    -H 'Content-Type: application/json' \
                    -d '{"msgtype": "text", 
                            "text": {
                                "content": "😄👍构建成功👍😄\n 关键字：luffy\n 项目名称: ${JOB_BASE_NAME}\n Commit Id: ${GIT_COMMIT}\n 构建地址：${RUN_DISPLAY_URL}"
                        }
                }'
            """
        }
        failure {
            echo 'Oh no!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744' \
                    -H 'Content-Type: application/json' \
                    -d '{"msgtype": "text", 
                            "text": {
                                "content": "😖❌构建失败❌😖\n 关键字：luffy\n 项目名称: ${JOB_BASE_NAME}\n Commit Id: ${GIT_COMMIT}\n 构建地址：${RUN_DISPLAY_URL}"
                        }
                }'
            """
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
   
}

# 重新修改 vi Jenkinsfile


```

需要在`172.16.1.228` 节点安装maven环境 

链接: https://pan.baidu.com/s/1z9dRGv_4bS1uxBtk5jsZ2Q?pwd=3gva 提取码: 3gva

官网下载地址  https://maven.apache.org/download.cgi

国内华为镜像地址:https://mirrors.huaweicloud.com/apache/maven/maven-3/3.6.3/binaries/

```bash
# 解压
tar zxf apache-maven-3.6.3-bin.tar.gz

# 修改mvn配置，配置maven源和本地仓库路径
cat <<\EOF > apache-maven-3.6.3/conf/settings.xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 http://maven.apache.org/xsd/settings-1.0.0.xsd">
  <localRepository>/opt/maven-repo</localRepository>
  <proxies>
  </proxies>

  <servers>
  </servers>

  <mirrors>
    <mirror>
      <id>alimaven</id>
      <name>aliyun maven</name>
      <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
      <mirrorOf>central</mirrorOf>
    </mirror>
  </mirrors>

</settings>
EOF


# 拷贝目录,并软连接
cp -r apache-maven-3.6.3 /usr/lib/
ln -s /usr/lib/apache-maven-3.6.3/bin/mvn /usr/bin/mvn


# 验证
$ mvn -v
Apache Maven 3.6.3 (cecedd343002696d0abb50b32b541b8a6ba2883f)
Maven home: /usr/lib/apache-maven-3.6.3
Java version: 11.0.17, vendor: Red Hat, Inc., runtime: /usr/lib/jvm/java-11-openjdk-11.0.17.0.8-2.el7_9.x86_64
Default locale: en_US, platform encoding: UTF-8
OS name: "linux", version: "3.10.0-1160.36.2.el7.x86_64", arch: "amd64", family: "unix"
```

 修改Dockerfile.multi 为Dockerfile

```dockerfile
mv Dockerfile.multi Dockerfile
cat <<\EOF > Dockerfile
FROM java:8u111
WORKDIR /opt/eladmin
COPY eladmin-system/target/ .
CMD [ "sh", "-c", "java -Dspring.profiles.active=prod -jar eladmin-system-2.6.jar" ]
EOF

git add .
git commit -am 'modify Jenkinsfile and Dockerfile'
git push -u origin master 
```



###### [演示3：使用k8s部署服务](http://49.7.203.222:2023/#/devops/jenkinsfile-pratice?id=演示3：使用k8s部署服务)

- 在源代码新建mainfests目录，将k8s所需的文件放到mainfests目录中

- 将镜像地址改成模板，在pipeline中使用新构建的镜像进行替换

- 执行kubectl apply -f mainfests应用更改，需要配置kubectl认证

    ```bash
    /eladmin-api (master) $ mkdir mainifests;cd mainifests
    /eladmin-api (master)$ vim  eladmin-api.dpl.yaml
    cat <<\EOF >eladmin-api.dpl.yaml
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: eladmin-api
      namespace: luffy
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: eladmin-api
      template:
        metadata:
          labels:
            app: eladmin-api
        spec:
          imagePullSecrets:
          - name: registry-172-16-1-226
          containers:
          - name: eladmin-api
            image: {{IMAGE_URL}} #这里改成模板
            imagePullPolicy: IfNotPresent
            env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: eladmin
                  key: DB_HOST
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: eladmin-secret
                  key: DB_USER
            - name: DB_PWD
              valueFrom:
                secretKeyRef:
                  name: eladmin-secret
                  key: DB_PWD
            - name: REDIS_HOST
              valueFrom:
                configMapKeyRef:
                  name: eladmin
                  key: REDIS_HOST
            - name: REDIS_PORT
              valueFrom:
                configMapKeyRef:
                  name: eladmin
                  key: REDIS_PORT
            ports:
            - containerPort: 8000
            resources:
              requests:
                memory: 200Mi
                cpu: 50m
              limits:
                memory: 1Gi
                cpu: 2
            livenessProbe:
              tcpSocket:
                port: 8000
              initialDelaySeconds: 20
              periodSeconds: 15
              timeoutSeconds: 3
            readinessProbe:
              httpGet:
                path: /auth/code
                port: 8000
                scheme: HTTP
              initialDelaySeconds: 20
              timeoutSeconds: 3
              periodSeconds: 15
    EOF
    # 有之前部署的yaml 文件就可以用之前的部署的yaml文件
    # kubectl -n luffy get deployments.apps eladmin-api -oyaml>eladmin-api.dpl.yaml
    # vi eladmin-api.dpl.yaml #删除不需要的信息.
  
  
    #将master上认证文件复制到jenkins-agent机器上
    scp -r k8s-master:/root/.kube /root
  
  
    ```



调整Jenkinsfile  # jenkins/pipelines/p4.yaml

```bash

pipeline {
    agent { label '172.16.1.228'}

    environment {
        IMAGE_REPO = "172.16.1.226:5000/eladmin"
    }

    stages {
        stage('printenv') {
            steps {
              echo 'Hello World'
              sh 'printenv'
            }
        }
        stage('check') {
            steps {
                checkout scm
            }
        }
        stage('build-image') {
            steps {
                retry(2) { sh 'docker build . -t ${IMAGE_REPO}:${GIT_COMMIT}'}
            }
        }
        stage('push-image') {
            steps {
                retry(2) { sh 'docker push ${IMAGE_REPO}:${GIT_COMMIT}'}
            }
        }
        stage('deploy') {
            steps {
                sh "sed -i 's#{{IMAGE_URL}}#${IMAGE_REPO}:${GIT_COMMIT}#g' mainifests/*"
                timeout(time: 1, unit: 'MINUTES') {
                    sh "kubectl apply -f mainifests/"
                }
            }
        }
    }
    post {
        success { 
            echo 'Congratulations!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744' \
                    -H 'Content-Type: application/json' \
                    -d '{"msgtype": "text", 
                            "text": {
                                "content": "😄👍构建成功👍😄\n 关键字：myblog\n 项目名称: ${JOB_BASE_NAME}\n Commit Id: ${GIT_COMMIT}\n 构建地址：${RUN_DISPLAY_URL}"
                        }
                }'
            """
        }
        failure {
            echo 'Oh no!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=740b792c8b2a02d4ead9826263b562c36e8e30d9d15bc5b9de1712fa7d469744' \
                    -H 'Content-Type: application/json' \
                    -d '{"msgtype": "text", 
                            "text": {
                                "content": "😖❌构建失败❌😖\n 关键字：luffy\n 项目名称: ${JOB_BASE_NAME}\n Commit Id: ${GIT_COMMIT}\n 构建地址：${RUN_DISPLAY_URL}"
                        }
                }'
            """
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}



```

###### [演示4：使用凭据管理敏感信息](http://49.7.203.222:2023/#/devops/jenkinsfile-pratice?id=演示4：使用凭据管理敏感信息)

上述Jenkinsfile中存在的问题是敏感信息使用明文，暴漏在代码中，如何管理流水线中的敏感信息（包含账号密码），之前我们在对接gitlab的时候，需要账号密码，已经使用过凭据来管理这类敏感信息，同样的，我们可以使用凭据来存储钉钉的token信息，创建凭据:

[Dashboard] ==> [系统管理]==>[凭据]==> [系统] =>  [全局凭据 (unrestricted)](http://jenkins.luffy.com/manage/credentials/store/system/domain/_/)

new credentials :

-  类型: username with password 
- 用户名: dingTalk  #这里可以自定义
- 密码:  粘贴 钉钉的token

	- ID: dingTalk   #唯一标识
	- 描述: dingTalk robot access token



如何在Jenkinsfile中获取已有凭据的内容？

Jenkins 的声明式流水线语法有一个 `credentials()` 辅助方法（在[`environment`](https://jenkins.io/zh/doc/book/pipeline/jenkinsfile/#../syntax#environment) 指令中使用），它支持 [secret 文本](https://jenkins.io/zh/doc/book/pipeline/jenkinsfile/##secret-text)，[带密码的用户名](https://jenkins.io/zh/doc/book/pipeline/jenkinsfile/##usernames-and-passwords)，以及 [secret 文件](https://jenkins.io/zh/doc/book/pipeline/jenkinsfile/##secret-files)凭据。

下面的流水线代码片段展示了如何创建一个使用带密码的用户名凭据的环境变量的流水线。

在该示例中，带密码的用户名凭据被分配了环境变量，用来使你的组织或团队以一个公用账户访问 Bitbucket 仓库；这些凭据已在 Jenkins 中配置了凭据 ID `jenkins-bitbucket-common-creds`。

当在 [`environment`](https://jenkins.io/zh/doc/book/pipeline/jenkinsfile/#../syntax#environment) 指令中设置凭据环境变量时：

```
environment {
    BITBUCKET_COMMON_CREDS = credentials('jenkins-bitbucket-common-creds')
}
```

这实际设置了下面的三个环境变量：

- `BITBUCKET_COMMON_CREDS` - 包含一个以冒号分隔的用户名和密码，格式为 `username:password`。
- `BITBUCKET_COMMON_CREDS_USR` - 附加的一个仅包含用户名部分的变量。
- `BITBUCKET_COMMON_CREDS_PSW` - 附加的一个仅包含密码部分的变量。

```groovy
pipeline {
    agent {
        // 此处定义 agent 的细节
    }
    environment {
        //顶层流水线块中使用的 environment 指令将适用于流水线中的所有步骤。 
        BITBUCKET_COMMON_CREDS = credentials('jenkins-bitbucket-common-creds')
    }
    stages {
        stage('Example stage 1') {
             //在一个 stage 中定义的 environment 指令只会将给定的环境变量应用于 stage 中的步骤。
            environment {
                BITBUCKET_COMMON_CREDS = credentials('another-credential-id')
            }
            steps {
                // 
            }
        }
        stage('Example stage 2') {
            steps {
                // 
            }
        }
    }
}
```

因此对Jenkinsfile做改造：jenkins/pipelines/p5.yaml

```bash

pipeline {
    agent { label '172.16.1.228'}

    environment {
        IMAGE_REPO = "172.16.1.226:5000/eladmin"
        DINGTALK_CREDS = credentials('dingTalk')
    }

    stages {
        stage('printenv') {
            steps {
            echo 'Hello World'
            sh 'printenv'
            }
        }
        stage('check') {
            steps {
                checkout scm
            }
        }
        stage('mvn clean package') {
        	steps {
        		sh 'mvn clean package'
        	}
        }
        stage('build-image') {
            steps {
                retry(2) { sh 'docker build . -t ${IMAGE_REPO}:${GIT_COMMIT}'}
            }
        }
        stage('push-image') {
            steps {
                retry(2) { sh 'docker push ${IMAGE_REPO}:${GIT_COMMIT}'}
            }
        }
        stage('deploy') {
            steps {
                sh "sed -i 's#{{IMAGE_URL}}#${IMAGE_REPO}:${GIT_COMMIT}#g' mainifests/*"
                timeout(time: 1, unit: 'MINUTES') {
                    sh "kubectl apply -f mainifests/"
                }
            }
        }
    }
    post {
        success { 
            echo 'Congratulations!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{"msgtype": "text", 
                            "text": {
                                "content": "😄👍构建成功👍😄\n 关键字：luffy\n 项目名称: ${JOB_BASE_NAME}\n Commit Id: ${GIT_COMMIT}\n 构建地址：${RUN_DISPLAY_URL}"
                        }
                }'
            """
        }
        failure {
            echo 'Oh no!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{"msgtype": "text", 
                            "text": {
                                "content": "😖❌构建失败❌😖\n 关键字：luffy\n 项目名称: ${JOB_BASE_NAME}\n Commit Id: ${GIT_COMMIT}\n 构建地址：${RUN_DISPLAY_URL}"
                        }
                }'
            """
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}

# ------操作, 查看jeknins构建过程
vi Jenkinsfile  

git commit -am "modify Jenkinsfile"

git push -u origin master
```

###### [本章小结](http://49.7.203.222:2023/#/devops/jenkinsfile-pratice?id=本章小结)

上面我们已经通过Jenkinsfile完成了最简单的项目的构建和部署，那么我们来思考目前的方式：

1. 目前都是在项目的单一分支下进行操作，企业内一般会使用feature、develop、release、master等多个分支来管理整个代码提交流程，如何根据不同的分支来做构建？
2. 构建视图中如何区分不同的分支?
3. 如何不配置webhook的方式实现构建？
4. 如何根据不同的分支选择发布到不同的环境(开发、测试、生产)？



# [多分支流水线实战](http://49.7.203.222:2023/#/devops/multi-branch-pipeline?id=多分支流水线)

[官方示例](https://jenkins.io/zh/doc/tutorials/build-a-multibranch-pipeline-project/)

我们简化一下流程，假如使用develop分支作为开发分支，master分支作为集成测试分支，看一下如何使用多分支流水线来管理。

###### [演示1：多分支流水线的使用]

1. 提交develop分支：

```bash
git checkout -b develop        #基于本地分支创建新分支develop
git push --set-upstream origin develop  #推送新分支到远程仓库时, --set-upstream 简写 -u

```

1. 禁用pipeline项目 (项目配置-->右上角 禁用)

2. Jenkins端创建多分支流水线项目  #名称: eladmin-api-muitl-pipeline
   - 增加git分支源   
   
     - 项目仓库 http://gitlab.luffy.com/eladmin/eladmin-api.git
   
     - 凭据  选择 root/****
   
     - add --> 发现标签
   
     - add--> 根据名称过滤(支持正则表达式): develop|master|.*
   
     - add-->高级克隆，add--> 设置浅克隆  1
   
     - 扫描 多分支流水线 触发器
   
       Periodically if not otherwise run  选择 1 minute

保存后，会自动检索项目中所有存在Jenkinsfile文件的分支和标签，若匹配我们设置的过滤正则表达式，则会添加到多分支的构建视图中。所有添加到视图中的分支和标签，会默认执行一次构建任务。

###### [演示2：美化消息通知内容]

- 添加构建阶段记录
- 使用markdown格式，添加构建分支消息

jenkins/pipelines/p6.yaml

```bash
# develop 分支
cat <<\EOF > Jenkinsfile
pipeline {
    agent { label '172.16.1.228'}

    environment {
        IMAGE_REPO = "172.16.1.226:5000/eladmin"
        DINGTALK_CREDS = credentials('dingTalk')
        TAB_STR = "\n                    \n&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
    }

    stages {
        stage('printenv') {
            steps {
                script{
                    sh "git log --oneline -n 1 > gitlog.file"
                    env.GIT_LOG = readFile("gitlog.file").trim()
                }
                sh 'printenv'
            }
        }
        stage('checkout') {
            steps {
                checkout scm
                script{
                    env.BUILD_TASKS = env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('mvn clean package') {
        	steps {
        		sh 'mvn clean package'
        	}
        }
        stage('build-image') {
            steps {
                retry(2) { sh 'docker build . -t ${IMAGE_REPO}:${GIT_COMMIT}'}
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('push-image') {
            steps {
                retry(2) { sh 'docker push ${IMAGE_REPO}:${GIT_COMMIT}'}
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('deploy') {
            steps {
                sh "sed -i 's#{{IMAGE_URL}}#${IMAGE_REPO}:${GIT_COMMIT}#g' mainifests/*"
                timeout(time: 1, unit: 'MINUTES') {
                    sh "kubectl apply -f mainifests/"
                }
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
    }
    post {
        success { 
            echo 'Congratulations!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😄👍 构建成功 👍😄  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${GIT_BRANCH}   \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
            """ 
        }
        failure {
            echo 'Oh no!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😖❌ 构建失败 ❌😖  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${GIT_BRANCH}  \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
            """
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}
EOF

git commit -am "muilt pipeline jenkinsfile"
git push -u origin develop
```

###### [演示3：通知gitlab构建状态](http://49.7.203.222:2023/#/devops/multi-branch-pipeline?id=演示3：通知gitlab构建状态)

Jenkins端做了构建，可以通过gitlab通过的api将构建状态通知过去，作为开发人员发起Merge Request或者合并Merge Request的依据之一。

*注意一定要指定gitLabConnection('gitlab')，不然没法认证到Gitlab端* 

#这里gitlab就是最开始在jeknis 系统设置里配置的 gitlab connections -->Connection name

```bash
   #配置说明 
   options {
        buildDiscarder(logRotator(numToKeepStr: '10'))  # 保留构建记录个数
        disableConcurrentBuilds()                 # 禁止并行构建
        timeout(time: 20, unit: 'MINUTES')      # Pipeline 的超时时间为 20 分钟,超过时间就失败 
        gitLabConnection('gitlab')             # 配置指定了与 GitLab 的连接
    }
    
    
 updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success') #将构建状态信息发给gitlab
```



jenkins/pipelines/p7.yaml

```bash
cat <<\EOF > Jenkinsfile
pipeline {
    agent { label '172.16.1.228'}
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
        gitLabConnection('gitlab')
    }

    environment {
        IMAGE_REPO = "172.16.1.226:5000/eladmin"
        DINGTALK_CREDS = credentials('dingTalk')
        TAB_STR = "\n                    \n&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
    }

    stages {
        stage('printenv') {
            steps {
                script{
                    sh "git log --oneline -n 1 > gitlog.file"
                    env.GIT_LOG = readFile("gitlog.file").trim()
                }
                sh 'printenv'
            }
        }
        stage('checkout') {
            steps {
                checkout scm
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS = env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('mvn clean package') {
        	steps {
        		sh 'mvn clean package'
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
        	}
        }
        stage('build-image') {
            steps {
                retry(2) { sh 'docker build . -t ${IMAGE_REPO}:${GIT_COMMIT}'}
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('push-image') {
            steps {
                retry(2) { sh 'docker push ${IMAGE_REPO}:${GIT_COMMIT}'}
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('deploy') {
            steps {
                sh "sed -i 's#{{IMAGE_URL}}#${IMAGE_REPO}:${GIT_COMMIT}#g' mainifests/*"
                timeout(time: 1, unit: 'MINUTES') {
                    sh "kubectl apply -f mainifests/"
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
    }
    post {
        success { 
            echo 'Congratulations!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😄👍 构建成功 👍😄  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${BRANCH_NAME}   \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
            """ 
        }
        failure {
            echo 'Oh no!'
            sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😖❌ 构建失败 ❌😖  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${BRANCH_NAME}  \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
            """
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}
EOF

git commit -am "update to gitlab for Jenkinsfile"
git push  #在develop 分支
```

我们可以访问gitlab，然后找到commit记录，查看同步状态

http://gitlab.luffy.com/eladmin/eladmin-api/-/pipelines/

![img](./7基于Kubernetes的DevOps平台实践.assets/gitlab-cicd.jpg)

```text
GitLab 构建状态通知:
  Jenkins 构建完成后, 将状态回写 GitLab
  在 GitLab pipeline 页面可见
  (作为合并代码的依据之一)
```


提交merge request，也可以查看到相关的任务状态，可以作为项目owner合并代码的依据之一：

![img](./7基于Kubernetes的DevOps平台实践.assets/gitlab-merge-request.jpg)

```text
Merge Request 关联:
  提交 MR 时可看到相关任务/构建状态
  项目 owner 据此决定是否合并
```


###### [本章小节](http://49.7.203.222:2023/#/devops/multi-branch-pipeline?id=本章小节)

优势:

- 根据分支展示, 视图人性化
- 自动检测各分支的变更

思考：

- Jenkins的slave端，没有任务的时候处于闲置状态，slave节点多的话造成资源浪费
- 是否可以利用kubernetes的Pod来启动slave，动态slave pod来执行构建任务



# Jenkins与K8S集成

#### [工具集成与Jenkinsfile实践篇](http://49.7.203.222:2023/#/devops/jenkins-with-k8s?id=工具集成与jenkinsfile实践篇)

1. Jenkins如何对接kubernetes集群
2. 使用kubernetes的Pod-Template来作为动态的agent执行Jenkins任务
3. 如何制作agent容器实现不同类型的业务的集成
4. 集成代码扫描、docker镜像自动构建、k8s服务部署、自动化测试

##### [集成Kubernetes]

###### [插件安装及配置]

[插件官方文档](https://plugins.jenkins.io/kubernetes/)

1. [系统管理] -> [插件管理] -> [搜索kubernetes]->直接安装

   若安装失败，请先更新[ bouncycastle API Plugin](https://plugins.jenkins.io/bouncycastle-api)并重新启动Jenkins

2. [系统管理] -> [节点管理] ->clouds -->  [Add a new cloud]

3. 配置地址信息

   - Kubernetes 地址: https://kubernetes.default
   - Kubernetes 命名空间：jenkins
   - 服务证书不用写（我们在安装Jenkins的时候已经指定过serviceAccount），均使用默认
   - 连接测试，成功会提示：Connection test successful
   - Kubernetes 命名空间: jenkins
   - Jenkins地址：http://jenkins:8080
   - Jenkins 通道 ：jenkins:50000

4. 配置Pod Template  #新版是在左边列表专门有一个pod templates 点[Add a pod template]

   - 名称: jnlp-slave

   - 命名空间：jenkins

   - 标签列表：jnlp-slave，作为agent的label选择用    

   - 连接 Jenkins 的超时时间（秒） ：300，设置连接jenkins超时时间

   - 工作空间卷：选择hostpath，设置/opt/jenkins,注意需要设置目录权限，否则Pod没有权限 ![img](./7基于Kubernetes的DevOps平台实践.assets/workspace-volume.png)

```text
Jenkins K8s Pod 模板 - 工作空间:
  工作空间卷: hostPath, 路径 /opt/jenkins
  需设置目录权限, 否则 Pod 无权限写入
  (agent 改为 Pod 内容器, 非宿主机)
```


     ```bash
     # 打了标签的节点上操作
     chown -R 1000:1000 /opt/jenkins
     chmod 777 /opt/jenkins
     ```
   
     节点选择器: jnlp-slave
   
   工作空间卷:  host path workspace volume --> 主机路径:  /opt/jenkins

###### [演示动态slave pod](http://49.7.203.222:2023/#/devops/jenkins-with-k8s?id=演示动态slave-pod)

```bash
# 为准备运行jnlp-slave-agent的pod的节点打上label
kubectl label node k8s-slave1 jnlp-slave=true
# kubectl label node k8s-slave2 jnlp-slave=true

### 回放一次多分支流水线develop分支 # 修改label
# 或者修改代码中的Jenkinsfile 提交代码
agent { label 'jnlp-slave'}
```

执行任务，会下载默认的jnlp-slave镜像，地址为jenkins/inbound-agent:4.11-1-jdk11，我们可以先在k8s-master节点拉取下来该镜像： #这里镜像版本要和jenkins的版本保持一致, 这里都是使用最新版

```bash
$ docker pull jenkins/inbound-agent:latest-jdk17
```

保存jenkinsfile提交后，会出现报错，因为我们的agent已经不再是宿主机，而是Pod中的容器内，报错如下：

![image-20241028082420049](./7%E5%9F%BA%E4%BA%8EKubernetes%E7%9A%84DevOps%E5%B9%B3%E5%8F%B0%E5%AE%9E%E8%B7%B5.assets/image-20241028082420049.png)

```text
现象: 切换 agent 为 Pod 内容器后报错
  原因: 原命令依赖宿主机环境/工具, 容器内缺失
  需把所需命令行工具集成进 Pod 的容器镜像
```


因此我们需要将用到的命令行工具集成到Pod的容器内，但是思考如下问题：

- 目前是用的jnlp的容器，是java的环境，我们在此基础上需要集成很多工具，能不能创建一个新的容器，让新容器来做具体的任务，jnlp-slave容器只用来负责连接jenkins-master
- 针对不同的构建环境（java、python、go、nodejs），可以制作不同的容器，来执行对应的任务

> 

###### [Pod-Template中容器镜像的制作](http://49.7.203.222:2023/#/devops/jenkins-with-k8s?id=pod-template中容器镜像的制作)

为解决上述问题，我们制作一个tools镜像，集成常用的工具，来完成常见的构建任务，需要注意的几点：

- 使用alpine基础镜像，自身体积比较小
- 替换国内安装源
- 为了使用docker，安装了docker
- 为了克隆代码，安装git
- 为了后续做python的测试等任务，安装python环境
- 为了在容器中调用kubectl的命令，拷贝了kubectl的二进制文件
- 为了认证kubectl，需要在容器内部生成.kube目录及config文件

```bash
# slave1 机器操作 
mkdir tools;
# 拷贝maven
cp -r apache-maven-3.6.3 tools
cp `which kubectl` tools
cd tools
```

*Dockerfile*

```bash
cat <<\EOF >Dockerfile
FROM alpine:3.13.4
LABEL maintainer="inspur_lyx@hotmail.com"
USER root

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk update && \
    apk add  --no-cache openrc docker git curl tar gcc g++ make \
    bash shadow openjdk8 py-pip python3-dev  openssl-dev libffi-dev \
    libstdc++ harfbuzz nss freetype ttf-freefont && \
    mkdir -p /root/.kube && \
    usermod -a -G docker root

RUN rm -rf /var/cache/apk/* 
#-----------------安装 kubectl--------------------#
COPY kubectl /usr/local/bin/
RUN chmod +x /usr/local/bin/kubectl
# ------------------------------------------------#

#-----------------安装 maven--------------------#
COPY apache-maven-3.6.3 /usr/lib/apache-maven-3.6.3
RUN ln -s /usr/lib/apache-maven-3.6.3/bin/mvn /usr/local/bin/mvn && chmod +x /usr/local/bin/mvn
ENV MAVEN_HOME=/usr/lib/apache-maven-3.6.3
#------------------------------------------------#
EOF

```

执行镜像构建并推送到仓库中：

```bash
docker build . -t 172.16.1.226:5000/devops/tools:v1
docker push 172.16.1.226:5000/devops/tools:v1
```

我们可以直接使用该镜像做测试：

```bash
## 启动临时镜像做测试
$ docker run --rm -ti 172.16.1.226:5000/devops/tools:v1 bash
# / git clone http://xxxxxx.git
# / kubectl get no
# / python3
#/ docker

## 重新挂载docker的sock文件
docker run -v /var/run/docker.sock:/var/run/docker.sock --rm -ti 172.16.1.226:5000/devops/tools:v1 bash
```

###### [实践通过Jenkinsfile实现demo项目自动发布到kubenetes环境](http://49.7.203.222:2023/#/devops/jenkins-with-k8s?id=实践通过jenkinsfile实现demo项目自动发布到kubenetes环境)

更新Jenkins中的PodTemplate，添加tools镜像，注意同时要先添加名为jnlp的container，因为我们是使用自定义的PodTemplate覆盖掉默认的模板：

名称: jnlp

docker镜像: jenkins/inbound-agent:latest-jdk17  #版本和jenkins的jdk一致

运行的命令:  空

命令的参数: 空

![img](./7基于Kubernetes的DevOps平台实践.assets/pod-template-jnlp.png)

```text
Pod Template 配置:
  第一个 container: jnlp(默认 agent 容器)
  命令参数: 空
  (作为 Jenkins agent 的基础容器)
```


**再添加第二个container Template**

名称: tools

Docker 镜像:  172.16.1.226:5000/devops/tools:v1

其他参数默认就可以



**添加拉取镜像的认证信息**

```bash
# kubectl -n luffy get secrets registry-172-16-1-226 -oyaml > registry-172-16-1-226.yaml
# vi registry-172-16-1-226.yaml #去掉不用的信息, namespace修改成jenkins
apiVersion: v1
data:
  .dockerconfigjson: eyJhdXRocyI6eyIxNzIuMTYuMS4yMjY6NTAwMCI6eyJ1c2VybmFtZSI6ImFkbWluIiwicGFzc3dvcmQiOiJhZG1pbiIsImVtYWlsIjoiY2hlbmdrYW5naHVhQGZveG1haWwuY29tIiwiYXV0aCI6IllXUnRhVzQ2WVdSdGFXND0ifX19
kind: Secret
metadata:
  creationTimestamp: "2024-10-27T08:21:21Z"
  name: registry-172-16-1-226
  namespace: jenkins
type: kubernetes.io/dockerconfigjson
# kubectl create -f registry-172-16-1-226.yaml
[root@k8s-master jenkins]# kubectl -n jenkins get secrets
NAME                    TYPE                             DATA   AGE
gitlab-secret           Opaque                           2      2d2h
registry-172-16-1-226   kubernetes.io/dockerconfigjson   1      13s

```

拉取进项的Secret:  image Pull secret : 填写registry-172-16-1-226



在卷栏目，添加三个卷，

- Host Path Volume: `/var/run/docker.sock`，不然在容器中使用docker会提示docker服务未启动

- Host Path Volume:  `/opt/maven-repo`，本地maven仓库

- kubeconfig文件，用来认证kubectl，通过secret的方式进行挂载

    ```bash
    kubectl -n jenkins create secret generic kubeconfig --from-file=/root/.kube/config
    ```

​	Secret Volume: kubeconfig

​	挂载路径: /root/.kube/

![image-20241028090608549](./7基于Kubernetes的DevOps平台实践.assets/image-20241028090608549.png)

```text
tools 容器配置:
  挂载路径: /root/.kube/
  (将 kubeconfig 挂入, 使容器内 kubectl 能访问集群)
```


tools容器做好后，我们需要对Jenkinsfile做如下调整：

> 在jenkins添加一个全局凭证 用于 容器仓库登录 push
>
> 类型 username with password  用户名:admin  密码 admin   ID: registry

jenkins/pipelines/p8.yaml

```bash
cat <<\EOF > Jenkinsfile
pipeline {
    agent { label 'jnlp-slave'}
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
        gitLabConnection('gitlab')
    }

    environment {
    	REGISTRY = "172.16.1.226:5000"
        IMAGE_REPO = "172.16.1.226:5000/eladmin"
        DINGTALK_CREDS = credentials('dingTalk')
        REGISTRY_CREDS = credentials('registry')
        TAB_STR = "\n                    \n&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
    }

    stages {
        stage('printenv') {
            steps {
                script{
                    sh "git log --oneline -n 1 > gitlog.file"
                    env.GIT_LOG = readFile("gitlog.file").trim()
                }
                sh 'printenv'
            }
        }
        stage('checkout') {
            steps {
                container('tools') {
                    checkout scm
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS = env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('mvn clean package') {
        	steps {
        		container('tools') {
        			sh 'mvn clean package'
        		}
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
        	}
        }
        stage('build-image') {
            steps {
                container('tools') {
                    retry(2) { sh 'docker build . -t ${IMAGE_REPO}:${GIT_COMMIT}'}
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('push-image') {
            steps {
                container('tools') {
                    retry(2) { 
                    	sh """
                    	docker logout ${REGISTRY};
                        docker login ${REGISTRY} -u ${REGISTRY_CREDS_USR} -p ${REGISTRY_CREDS_PSW}
                    	docker push ${IMAGE_REPO}:${GIT_COMMIT}
                    	"""
                    }
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('deploy') {
            steps {
                container('tools') {
                    sh "sed -i 's#{{IMAGE_URL}}#${IMAGE_REPO}:${GIT_COMMIT}#g' mainifests/*"
                    timeout(time: 1, unit: 'MINUTES') {
                        sh "kubectl apply -f mainifests/"
                    }
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
    }
    post {
        success { 
           container('tools') {
              echo 'Congratulations!'
              sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😄👍 构建成功 👍😄  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${BRANCH_NAME}   \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
               """ 
           }
        }
        failure {
           container('tools') {
              echo 'Oh no!'
              sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😖❌ 构建失败 ❌😖  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${BRANCH_NAME}  \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
               """
           }
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}
EOF

git commit -am "add tools container time"
git push 
```

![image-20241028105341608](./7%E5%9F%BA%E4%BA%8EKubernetes%E7%9A%84DevOps%E5%B9%B3%E5%8F%B0%E5%AE%9E%E8%B7%B5.assets/image-20241028105341608.png)

```text
Jenkins 集成 SonarQube:
  git push 触发流水线
  流水线中调用 sonar-scanner 做代码扫描
  (扫描结果回传 SonarQube 服务端)
```


# jenkins集成Sonarqube

##### [集成sonarQube实现代码扫描]

Sonar可以从以下七个维度检测代码质量，而作为开发人员至少需要处理前5种代码质量问题。

1. 不遵循代码标准 sonar可以通过PMD,CheckStyle,Findbugs等等代码规则检测工具规范代码编写。
2. 潜在的缺陷 sonar可以通过PMD,CheckStyle,Findbugs等等代码规则检测工具检 测出潜在的缺陷。
3. 糟糕的复杂度分布 文件、类、方法等，如果复杂度过高将难以改变，这会使得开发人员 难以理解它们, 且如果没有自动化的单元测试，对于程序中的任何组件的改变都将可能导致需要全面的回归测试。
4. 重复 显然程序中包含大量复制粘贴的代码是质量低下的，sonar可以展示 源码中重复严重的地方。
5. 注释不足或者过多 没有注释将使代码可读性变差，特别是当不可避免地出现人员变动 时，程序的可读性将大幅下降 而过多的注释又会使得开发人员将精力过多地花费在阅读注释上，亦违背初衷。
6. 缺乏单元测试 sonar可以很方便地统计并展示单元测试覆盖率。
7. 糟糕的设计 通过sonar可以找出循环，展示包与包、类与类之间的相互依赖关系，可以检测自定义的架构规则 通过sonar可以管理第三方的jar包，可以利用LCOM4检测单个任务规则的应用情况， 检测耦合。

###### [sonarqube架构简介](http://49.7.203.222:2023/#/devops/jenkins-with-sonarqube?id=sonarqube架构简介)

![img](./7基于Kubernetes的DevOps平台实践.assets/sonarqube.webp)

```text
SonarQube 架构(CS 架构):
  SonarQube Server(Web / API / 计算引擎)
     |
     v
  SonarQube Database(元数据)
  扫描端: sonar-scanner(客户端) 采集代码 -> 上报
```


1. CS架构
   - sonarqube scanner
   - sonarqube server
2. SonarQube Scanner 扫描仪在本地执行代码扫描任务
3. 执行完后，将分析报告被发送到SonarQube服务器进行处理
4. SonarQube服务器处理和存储分析报告导致SonarQube数据库，并显示结果在UI中

###### [sonarqube on kubernetes环境搭建](http://49.7.203.222:2023/#/devops/jenkins-with-sonarqube?id=sonarqube-on-kubernetes环境搭建)

1. 资源文件准备

- 和gitlab共享postgres数据库
- 使用ingress地址 `sonar.luffy.com` 进行访问
- 使用initContainers进行系统参数调整
- sonar/sonar.yaml

```yaml
cat <<\EOF >sonar.yaml
apiVersion: v1
kind: Service
metadata:
  name: sonarqube
  namespace: jenkins
  labels:
    app: sonarqube
spec:
  ports:
  - name: sonarqube
    port: 9000
    targetPort: 9000
    protocol: TCP
  selector:
    app: sonarqube
---
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: jenkins
  name: sonarqube
  labels:
    app: sonarqube
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sonarqube
  template:
    metadata:
      labels:
        app: sonarqube
    spec:
      initContainers:
      - command:
        - /sbin/sysctl
        - -w
        - vm.max_map_count=262144
        image: alpine:3.6
        imagePullPolicy: IfNotPresent
        name: elasticsearch-logging-init
        resources: {}
        securityContext:
          privileged: true
      containers:
      - name: sonarqube
        image: sonarqube:7.9-community
        ports:
        - containerPort: 9000
        env:
        - name: SONARQUBE_JDBC_USERNAME
          valueFrom:
            secretKeyRef:
              name: gitlab-secret
              key: postgres.user.root
        - name: SONARQUBE_JDBC_PASSWORD
          valueFrom:
            secretKeyRef:
              name: gitlab-secret
              key: postgres.pwd.root
        - name: SONARQUBE_JDBC_URL
          value: "jdbc:postgresql://postgres:5432/sonar"
        livenessProbe:
          httpGet:
            path: /sessions/new
            port: 9000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /sessions/new
            port: 9000
          initialDelaySeconds: 60
          periodSeconds: 30
          failureThreshold: 6
        resources:
          limits:
            cpu: 2000m
            memory: 4096Mi
          requests:
            cpu: 1000m
            memory: 1024Mi
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sonarqube
  namespace: jenkins
spec:
  ingressClassName: nginx
  rules:
  - host: sonar.luffy.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service: 
            name: sonarqube
            port:
              number: 9000
              
EOF




```

1. sonarqube服务端安装

    ```bash
    # 创建sonar数据库
     kubectl -n jenkins exec -ti postgres-5d96874894-5p8q4 -- bash
    #/ psql 
    # create database sonar;
   
    ## 创建sonarqube服务器
    kubectl create -f sonar.yaml
   
    ## 配置本地hosts解析   
    172.16.1.226 sonar.luffy.com
    # kubectl -n kube-system edit cm coredns 
   
    ## 访问sonarqube，初始用户名密码为 admin/admin
    http://sonar.luffy.com
    ```

2. sonar-scanner的安装

    ```bash
    下载地址： https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.2.0.1873-linux.zip
   
    该地址比较慢，可以在网盘下载（https://pan.baidu.com/s/1SiEhWyHikTiKl5lEMX1tJg?pwd=tqb9 提取码: tqb9）。
   
    #github 下载
    https://github.com/SonarSource/sonar-scanner-cli/tags
    wget https://github.com/SonarSource/sonar-scanner-cli/archive/refs/tags/4.2.0.1873.zip
   
   
    [root@k8s-slave1 ~]# unzip sonar-scanner-cli-4.2.0.1873-linux.zip
    [root@k8s-slave1 ~]# mv sonar-scanner-4.2.0.1873-linux /opt/
   
    ```

   

   

   

3. 演示sonar代码扫描功能

   

   - 在项目根目录中准备配置文件 **sonar-project.properties**

     ```bash
     
     [root@k8s-slave1 ~]# git clone -b develop http://gitlab.luffy.com/eladmin/eladmin-api.git
     # cd eladmin-api
     # java 语言的扫描写法
     cat <<\EOF > sonar-project.properties
     sonar.projectKey=eladmin-api
     sonar.projectName=eladmin-api
     # if you want disabled the DTD verification for a proxy problem for example, true by default
     # JUnit like test report, default value is test.xml
     sonar.sources=eladmin-common/src/main/java,eladmin-system/src/main/java
     sonar.language=java
     sonar.tests=eladmin-common/src/test/java,eladmin-system/src/test/java
     sonar.java.binaries=eladmin-common/target/classes,eladmin-system/target/classes
     EOF
     
     git add .
     git commit -m "add sonar-project.properties"
     git push
     
     ```

   - 配置sonarqube服务器地址

     由于sonar-scanner需要将扫描结果上报给sonarqube服务器做质量分析，因此我们需要在sonar-scanner中配置sonarqube的服务器地址：

     在集群宿主机中测试，先配置一下hosts文件，然后配置sonar的地址：

     ```bash
     # vi /etc/hosts
     172.16.1.226 k8s-master jenkins.luffy.com gitlab.luffy.com sonar.luffy.com
     
     $ cat /root/sonar-scanner-4.2.0.1873-linux/conf/sonar-scanner.properties
     #----- Default SonarQube server
     #sonar.host.url=http://localhost:9000
     sonar.host.url=http://sonar.luffy.com
     #----- Default source code encoding
     #sonar.sourceEncoding=UTF-8
     ```

     ```bash
     # 为了使所有的pod都可以通过`sonar.luffy.com`访问，可以配置coredns的静态解析
     $ kubectl -n kube-system edit cm coredns 
     ...
               hosts {
                   172.16.1.226 jenkins.luffy.com gitlab.luffy.com sonar.luffy.com
                   fallthrough
            }
     ```

   - 执行扫描

     ```bash
     ## 在项目的根目录下执行
     $ /opt/sonar-scanner-4.2.0.1873-linux/bin/sonar-scanner  -X 
     # 提示  No files nor directories matching 'eladmin-common/target/classes'
     # 这个文件时需要mvn clean package 之后产生的
     $ mvn clean package
     $ /opt/sonar-scanner-4.2.0.1873-linux/bin/sonar-scanner  -X 
     
     16:46:24.190 INFO: ANALYSIS SUCCESSFUL, you can browse http://sonar.luffy.com/dashboard?id=eladmin-api
     16:46:24.190 INFO: Note that you will be able to access the updated dashboard once the server has process
     16:46:24.190 INFO: More about the report processing at http://sonar.luffy.com/api/ce/task?id=AZLTwwRhX8fS
     16:46:24.191 DEBUG: Report metadata written to /root/eladmin-api/.scannerwork/report-task.txt
     16:46:24.193 DEBUG: Post-jobs :
     16:46:24.194 INFO: Analysis total time: 22.067 s
     16:46:24.195 INFO: ------------------------------------------------------------------------
     16:46:24.195 INFO: EXECUTION SUCCESS
     16:46:24.195 INFO: ------------------------------------------------------------------------
     16:46:24.195 INFO: Total time: 23.031s
     16:46:24.231 INFO: Final Memory: 15M/60M
     16:46:24.231 INFO: ------------------------------------------------------------------------
     
     ```

   - sonarqube界面查看结果

     登录sonarqube界面查看结果，Quality Gates说明

java项目的配置文件通常格式为：

```bash
sonar.projectKey=eureka-cluster
sonar.projectName=eureka-cluster
# if you want disabled the DTD verification for a proxy problem for example, true by default
# JUnit like test report, default value is test.xml
sonar.sources=src/main/java
sonar.language=java
sonar.tests=src/test/java
sonar.java.binaries=target/classes
```

###### [插件安装及配置](http://49.7.203.222:2023/#/devops/jenkins-with-sonarqube?id=插件安装及配置)

1. 集成到tools容器中

    由于我们的代码拉取、构建任务均是在tools容器中进行，因此我们需要把scanner集成到我们的tools容器中，又因为scanner是一个cli客户端，因此我们直接把包解压好，拷贝到tools容器内部，配置一下PATH路径即可，注意两点：

    - 直接在在tools镜像中配置`http://sonar.luffy.com`

    - 由于tools已经集成了java环境，因此可以直接剔除scanner自带的jre

      - 删掉sonar-scanner/jre目录

      - 修改sonar-scanner/bin/sonar-scanner

        `use_embedded_jre=false`

        ```bash
        cd /root/tools
        cp -r /opt/sonar-scanner-4.2.0.1873-linux/ sonar-scanner
        ## sonar配置，由于我们是在Pod中使用，也可以直接配置：sonar.host.url=http://sonarqube:9000
        $ cat sonar-scanner/conf/sonar-scanner.properties
        #----- Default SonarQube server
        sonar.host.url=http://sonar.luffy.com
   
        #----- Default source code encoding
        #sonar.sourceEncoding=UTF-8
   
        rm -rf sonar-scanner/jre
        $ vi sonar-scanner/bin/sonar-scanner
        ...
        use_embedded_jre=false
        ...
        ```

    *Dockerfile*

    `root/tools/Dockerfile`

    ```dockerfile
    #vim Dockerfile
    FROM alpine:3.13.4
    LABEL maintainer="inspur_lyx@hotmail.com"
    USER root
   
    RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
        apk update && \
        apk add  --no-cache openrc docker git curl tar gcc g++ make \
        bash shadow openjdk8 python2 python2-dev py-pip python3-dev openssl-dev libffi-dev \
        libstdc++ harfbuzz nss freetype ttf-freefont && \
        mkdir -p /root/.kube && \
        usermod -a -G docker root
   
    # COPY config /root/.kube/
   
   
    RUN rm -rf /var/cache/apk/*
   
    #-----------------安装 kubectl--------------------#
    COPY kubectl /usr/local/bin/
    RUN chmod +x /usr/local/bin/kubectl
    # ------------------------------------------------#
   
    #-----------------安装 maven--------------------#
    COPY apache-maven-3.6.3 /usr/lib/apache-maven-3.6.3
    RUN ln -s /usr/lib/apache-maven-3.6.3/bin/mvn /usr/local/bin/mvn && chmod +x /usr/local/bin/mvn
    ENV MAVEN_HOME=/usr/lib/apache-maven-3.6.3
    #------------------------------------------------#
   
    #---------------安装 sonar-scanner-----------------#
    COPY sonar-scanner /usr/lib/sonar-scanner
    RUN ln -s /usr/lib/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner && chmod +x /usr/local/bin/sonar-scanner
    ENV SONAR_RUNNER_HOME=/usr/lib/sonar-scanner
    # ------------------------------------------------#
    ```

重新构建镜像，并推送到仓库：

```bash
   $ docker build . -t 172.16.1.226:5000/devops/tools:v2
   $ docker push 172.16.1.226:5000/devops/tools:v2
   
```

1. 修改Jenkins PodTemplate

   为了在新的构建任务中可以拉取v2版本的tools镜像，需要更新PodTemplate

2. 安装并配置sonar插件

   由于sonarqube的扫描的结果需要进行Quality Gates的检测，那么我们在容器中执行完代码扫描任务后，如何知道本次扫描是否通过了Quality Gates，那么就需要借助于sonarqube实现的jenkins的插件。

   - 安装插件

     插件中心搜索sonarqube，直接安装  [SonarQube ScannerVersion2.17.2]

   - 配置插件

     系统管理->系统配置-> **SonarQube servers** ->Add SonarQube

     - Name：sonarqube

     - Server URL：http://sonar.luffy.com

     - Server authentication token

       ① 登录sonarqube -> My Account -> Security -> Generate Token

       ② 登录Jenkins，添加全局凭据，类型为Secret text

   - 如何在jenkinsfile中使用

     我们在 https://jenkins.io/doc/pipeline/steps/sonar/ 官方介绍中可以看到：

###### [Jenkinsfile集成sonarqube演示] 

修改Jenkinsfile

```bash
cat <<\EOF>Jenkinsfile
pipeline {
    agent { label 'jnlp-slave'}

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
        gitLabConnection('gitlab')
    }


    environment {
        REGISTRY = "172.16.1.226:5000"
        IMAGE_REPO = "172.16.1.226:5000/eladmin"
        DINGTALK_CREDS = credentials('dingTalk')
        REGISTRY_CREDS = credentials('registry')
        TAB_STR = "\n                  \n&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
    }

    stages {
        stage('gitlog') {
            steps {
                script{
                    sh "git log --oneline -n 1 > gitlog.file"
                    env.GIT_LOG = readFile("gitlog.file").trim()
                }
                sh 'printenv'
            }
        }
        stage('checkout') {
            steps {
                checkout scm
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS = env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('mvn package') {
            steps {
                container('tools') {
                    sh 'mvn clean package'
                }               
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('CI'){
            failFast true
            parallel {
                stage('Unit Test') {
                    steps {
                        echo "Unit Test Stage Skip..."
                    }
                }
                stage('Code Scan') {
                    steps {
                        container('tools') {
                            withSonarQubeEnv('sonarqube') {
                                sh 'sonar-scanner -X'
                                sleep 3
                            }
                            script {
                                timeout(1) {
                                    def qg = waitForQualityGate('sonarqube')
                                    if (qg.status != 'OK') {
                                        error "未通过Sonarqube的代码质量阈检查，请及时修改！failure: ${qg.status}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        stage('build-image') {
            steps {
                container('tools') {
                    retry(2) { sh 'docker build . -t ${IMAGE_REPO}:${GIT_COMMIT}'}
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('push-image') {
            steps {
                container('tools') {
                    retry(2) { 
                        sh """
                            docker logout ${REGISTRY};
                            docker login ${REGISTRY} -u ${REGISTRY_CREDS_USR} -p ${REGISTRY_CREDS_PSW}
                            docker push ${IMAGE_REPO}:${GIT_COMMIT}
                            """
                        }
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('deploy') {
            steps {
                container('tools') {
                    timeout(time: 1, unit: 'MINUTES') {
                        sh "sed -i 's#{{IMAGE_URL}}#${IMAGE_REPO}:${GIT_COMMIT}#g' mainifests/*"
                        sh "kubectl apply -f mainifests/"
                    }
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
    }
    post {
        success { 
            container('tools') {
                echo 'Congratulations!'
                sh """
                    curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                        -H 'Content-Type: application/json' \
                        -d '{
                            "msgtype": "markdown",
                            "markdown": {
                                "title":"myblog",
                                "text": "😄👍 构建成功 👍😄  \n**项目名称**: luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${GIT_BRANCH}   \n**构建地址**: ${RUN_DISPLAY_URL}  \n**构建任务**: ${BUILD_TASKS}"
                            }
                        }'
                """ 
            }

        }
        failure {
            container('tools') {
                echo 'Oh no!'
                sh """
                    curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                        -H 'Content-Type: application/json' \
                        -d '{
                            "msgtype": "markdown",
                            "markdown": {
                                "title":"myblog",
                                "text": "😖❌ 构建失败 ❌😖  \n**项目名称**: luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${GIT_BRANCH}  \n**构建地址**: ${RUN_DISPLAY_URL}  \n**构建任务**: ${BUILD_TASKS}"
                            }
                        }'
                """
            }

        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}
EOF
git commit -am"add ci"
git push
```

若Jenkins执行任务过程中sonarqube端报类似下图的错： ![img](./7基于Kubernetes的DevOps平台实践.assets/sonar-scanner-err.png)

```text
SonarQube 报错(pending):
  Jenkins 任务中 sonar-scanner 报 pending 类错误
  原因: SonarQube 未收到 webhook 回调
  需在 SonarQube 服务端配置 webhook
```


则需要在sonarqube服务端进行如下配置，添加一个webhook： 

Name: jenkins

URL: http://jenkins:8080/sonarqube-webhook/

![img](./7基于Kubernetes的DevOps平台实践.assets/fix-sonar-scanner-pending-err.png)

```text
修复: 添加 SonarQube Webhook
  SonarQube 管理 -> 配置 -> Webhooks
  URL: http://jenkins:8080/sonarqube-webhook/
  (扫描完成后回调 Jenkins, 解除 pending)
```




# jenkins集成robotFramework

##### [集成RobotFramework实现验收测试]

一个基于Python语言，用于验收测试和验收测试驱动开发（ATDD）的通用测试自动化框架，提供了一套特定的语法，并且有非常丰富的测试库 。

###### [robot用例简介]

```bash
# cat robot/robot.txt
cat <<\EOF > robot.txt
*** Settings ***
Library           RequestsLibrary
Library           SeleniumLibrary

*** Variables ***
${api_url}       http://eladmin-api.luffy:8000/

*** Test Cases ***
api1
    [Tags]  critical
    Create Session    api    ${api_url}
    ${alarm_system_info}    RequestsLibrary.Get Request    api    /
    log    ${alarm_system_info.status_code}
    log    ${alarm_system_info.content}
    should be true    ${alarm_system_info.status_code} == 200

api2
    [Tags]  critical
    Create Session    api    ${api_url}
    ${alarm_system_info}    RequestsLibrary.Get Request    api    /auth/code
    log    ${alarm_system_info.status_code}
    log    ${alarm_system_info.content}
    should be true    ${alarm_system_info.status_code} == 200
EOF
    
```


```bash
# 使用tools镜像启动容器，来验证手动使用robotframework来做验收测试
$ docker run --rm -ti 172.16.1.226:5000/devops/tools:v2 bash
bash-5.0# apk add py-pip python3-dev
$ cat requirements.txt
robotframework
robotframework-seleniumlibrary
robotframework-databaselibrary
robotframework-requests

#pip安装必要的软件包
$ python3 -m pip install --upgrade pip -i http://mirrors.aliyun.com/pypi/simple --trusted-host mirrors.aliyun.com && pip3 install -i http://mirrors.aliyun.com/pypi/simple --trusted-host mirrors.aliyun.com -r requirements.txt 

$ cat /etc/resolv.conf
search jenkins.svc.cluster.local svc.cluster.local cluster.local in.ctcdn.cn ss.in.ctcdn.cn
nameserver 10.96.0.10
options ndots:5


# vi robot.txt #复制上面的代码
#使用robot命令做测试
$ robot -d artifacts/ robot.txt
```

###### [与tools工具镜像集成](http://49.7.203.222:2023/#/devops/jenkins-with-robotframework?id=与tools工具镜像集成)

```powershell
cd tools  #k8s-slave1 
cat <<\EOF >requirements.txt
robotframework
robotframework-seleniumlibrary
robotframework-databaselibrary
robotframework-requests
EOF

cat <<\EOF >Dockerfile
FROM alpine:3.13.4
LABEL maintainer="inspur_lyx@hotmail.com"
USER root

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories && \
    apk update && \
    apk add  --no-cache openrc docker git curl tar gcc g++ make \
    bash shadow openjdk8 python2 python2-dev py-pip python3-dev openssl-dev libffi-dev \
    libstdc++ harfbuzz nss freetype ttf-freefont chromium chromium-chromedriver && \
    mkdir -p /root/.kube && \
    usermod -a -G docker root


# COPY config /root/.kube/

COPY requirements.txt /

RUN python3 -m pip install --upgrade pip -i http://mirrors.aliyun.com/pypi/simple --trusted-host mirrors.aliyun.com && pip3 install -i http://mirrors.aliyun.com/pypi/simple --trusted-host mirrors.aliyun.com -r requirements.txt  


RUN rm -rf /var/cache/apk/* && \
    rm -rf ~/.cache/pip

#-----------------安装 kubectl--------------------#
COPY kubectl /usr/local/bin/
RUN chmod +x /usr/local/bin/kubectl
# ------------------------------------------------#

#-----------------安装 maven--------------------#
COPY apache-maven-3.6.3 /usr/lib/apache-maven-3.6.3
RUN ln -s /usr/lib/apache-maven-3.6.3/bin/mvn /usr/local/bin/mvn && chmod +x /usr/local/bin/mvn
ENV MAVEN_HOME=/usr/lib/apache-maven-3.6.3
#------------------------------------------------#

#---------------安装 sonar-scanner-----------------#
COPY sonar-scanner /usr/lib/sonar-scanner
RUN ln -s /usr/lib/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner && chmod +x /usr/local/bin/sonar-scanner
ENV SONAR_RUNNER_HOME=/usr/lib/sonar-scanner
# ------------------------------------------------#
EOF

docker build . -t 172.16.1.226:5000/devops/tools:v3

docker push 172.16.1.226:5000/devops/tools:v3
```

更新Jenkins中kubernetes中的containers pod template

###### [插件安装及配置](http://49.7.203.222:2023/#/devops/jenkins-with-robotframework?id=插件安装及配置)

为什么要安装robot插件？

1. 安装robotFramework

   - 插件中心搜索robotframework，直接安装
   - tools集成robot命令（之前已经安装）

2. 与jenkinsfile的集成

    ```groovy
        container('tools') {
            sh 'robot  -d artifacts/ robot.txt || echo ok'
            echo "R ${currentBuild.result}"
            step([
                $class : 'RobotPublisher',
                outputPath: 'artifacts/',
                outputFileName : "output.xml",
                disableArchiveOutput : false,
                passThreshold : 80,
                unstableThreshold: 20.0,
                onlyCritical : true,
                otherFiles : "*.png"
            ])
            echo "R ${currentBuild.result}"
            archiveArtifacts artifacts: 'artifacts/*', fingerprint: true
        }
    ```

###### [实践通过Jenkinsfile实现demo项目的验收测试](http://49.7.203.222:2023/#/devops/jenkins-with-robotframework?id=实践通过jenkinsfile实现demo项目的验收测试)

项目源代码添加robot.txt文件：

```bash
cat <<\EOF >robot.txt
*** Settings ***
Library           RequestsLibrary
Library           SeleniumLibrary

*** Variables ***
${api_url}       http://eladmin-api.luffy:8000/

*** Test Cases ***
api1
    [Tags]  critical
    Create Session    api    ${api_url}
    ${alarm_system_info}    RequestsLibrary.Get Request    api    /
    log    ${alarm_system_info.status_code}
    log    ${alarm_system_info.content}
    should be true    ${alarm_system_info.status_code} == 200

api2
    [Tags]  critical
    Create Session    api    ${api_url}
    ${alarm_system_info}    RequestsLibrary.Get Request    api    /auth/code
    log    ${alarm_system_info.status_code}
    log    ${alarm_system_info.content}
    should be true    ${alarm_system_info.status_code} == 200
EOF

```



修改Jenkinsfile

```bash

pipeline {
    agent { label 'jnlp-slave'}
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 20, unit: 'MINUTES')
        gitLabConnection('gitlab')
    }

    environment {
        IMAGE_REPO = "172.16.1.226:5000/myblog"
        DINGTALK_CREDS = credentials('dingTalk')
        TAB_STR = "\n                    \n&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
    }

    stages {
        stage('git-log') {
            steps {
                script{
                    sh "git log --oneline -n 1 > gitlog.file"
                    env.GIT_LOG = readFile("gitlog.file").trim()
                }
                sh 'printenv'
            }
        }        
        stage('checkout') {
            steps {
                container('tools') {
                    checkout scm
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS = env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('mvn package') {
            steps {
                container('tools') {
                    sh 'mvn clean package'
                }               
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('CI'){
            failFast true
            parallel {
                stage('Unit Test') {
                    steps {
                        echo "Unit Test Stage Skip..."
                    }
                }
                stage('Code Scan') {
                    steps {
                        container('tools') {
                            withSonarQubeEnv('sonarqube') {
                                sh 'sonar-scanner -X'
                                sleep 3
                            }
                            script {
                                timeout(1) {
                                    def qg = waitForQualityGate('sonarqube')
                                    if (qg.status != 'OK') {
                                        error "未通过Sonarqube的代码质量阈检查，请及时修改！failure: ${qg.status}"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        stage('build-image') {
            steps {
                container('tools') {
                    retry(2) { sh 'docker build . -t ${IMAGE_REPO}:${GIT_COMMIT}'}
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('push-image') {
            steps {
                container('tools') {
                    retry(2) { sh 'docker push ${IMAGE_REPO}:${GIT_COMMIT}'}
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('deploy') {
            steps {
                container('tools') {
                    sh "sed -i 's#{{IMAGE_URL}}#${IMAGE_REPO}:${GIT_COMMIT}#g' mainifests/*"
                    timeout(time: 1, unit: 'MINUTES') {
                        sh "kubectl apply -f mainifests/;sleep 20;"
                    }
                }
                updateGitlabCommitStatus(name: env.STAGE_NAME, state: 'success')
                script{
                    env.BUILD_TASKS += env.STAGE_NAME + "√..." + env.TAB_STR
                }
            }
        }
        stage('Accept Test') {
            steps {
                    container('tools') {
                        sh 'robot -d artifacts/ robot.txt'
                        echo "R ${currentBuild.result}"
                        step([
                            $class : 'RobotPublisher',
                            outputPath: 'artifacts/',
                            outputFileName : "output.xml",
                            disableArchiveOutput : false,
                            passThreshold : 80,
                            unstableThreshold: 20.0,
                            onlyCritical : true,
                            otherFiles : "*.png"
                        ])
                        echo "R ${currentBuild.result}"
                        archiveArtifacts artifacts: 'artifacts/*', fingerprint: true
                    }
            }
        }
    }
    post {
        success { 
           container('tools') {
              echo 'Congratulations!'
              sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😄👍 构建成功 👍😄  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${BRANCH_NAME}   \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
               """ 
           }
        }
        failure {
           container('tools') {
              echo 'Oh no!'
              sh """
                curl 'https://oapi.dingtalk.com/robot/send?access_token=${DINGTALK_CREDS_PSW}' \
                    -H 'Content-Type: application/json' \
                    -d '{
                        "msgtype": "markdown",
                        "markdown": {
                            "title":"myblog",
                            "text": "😖❌ 构建失败 ❌😖  \n**项目名称**：luffy  \n**Git log**: ${GIT_LOG}   \n**构建分支**: ${BRANCH_NAME}  \n**构建地址**：${RUN_DISPLAY_URL}  \n**构建任务**：${BUILD_TASKS}"
                        }
                    }'
               """
           }
        }
        always { 
            echo 'I will always say Hello again!'
        }
    }
}
```

在Jenkins中查看robot的构建结果。



问题记录：

```bash
问题：运行多分支流水线项目，提示的 jenkins调用K8s 的jnlp 容器一直提示 is offline ，导致流水线项目没法走下去 一致卡在这个位置
Still waiting to schedule task 
‘jnlp-slave-lzts7’ is offline
排查
jenkins节点列表上能到这个jnlp容器上线了 log日志提示
Waiting for agent to connect (330/1000): jnlp-slave-9403h Waiting for agent to connect (360/1000): jnlp-slave-9403h Waiting for agent to connect (390/1000): jnlp-slave-9403h Waiting for agent to connect (420/1000): jnlp-slave-9403h
kubectl -n jenkins get po -owide 也能看容器运行了》
查看容器事件 无报错
Events:
  Type    Reason     Age    From               Message
  ----    ------     ----   ----               -------
  Normal  Scheduled  8m26s  default-scheduler  Successfully assigned jenkins/jnlp-slave-9403h to k8s-slave1
  Normal  Pulled     8m25s  kubelet            Container image "jenkins/inbound-agent:latest-jdk17" already present on machine
  Normal  Created    8m25s  kubelet            Created container jnlp
  Normal  Started    8m25s  kubelet            Started container jnlp
  Normal  Pulled     8m25s  kubelet            Container image "172.16.1.226:5000/devops/tools:v2" already present on machine
  Normal  Created    8m25s  kubelet            Created container tools
  Normal  Started    8m25s  kubelet            Started container tools
  
INFO: Could not locate server among [http://jenkins:8080/]; waiting 10 seconds before retry
java.io.IOException: Failed to connect to http://jenkins:8080/tcpSlaveAgentListener/: No route to host
  
已解决：    
重启 kubectl -n kube-system  get po   重启里面的容器(删除容器自己会重启)
每个节点systemctl restart kubectl
问题产生原因：  k8s机器卡住，强制重启服务器后。集群内部网络混乱了
```





# 小结

思路：

1. 讲解最基础的Jenkins的使用
2. Pipeline流水线的使用
3. Jenkinsfile的使用
4. 多分支流水线的使用
5. 与Kubernetes集成，动态jnlp slave pod的使用
6. 与sonarqube集成，实现代码扫描
7. 与Robotframework集成，实现验收测试

问题：

1. Jenkinsfile过于冗长
2. 多个项目配置Jenkinsfile，存在很多重复内容
3. 没有实现根据不同分支来部署到不同的环境
4. Java项目的构建
5. k8s部署后，采用等待的方式执行后续步骤，不合理