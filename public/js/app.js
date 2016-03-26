var chatApp = angular.module('ChatApp', ['ui.router','dpd','ngCookies']);

chatApp.value('dpdConfig', {
    collections: ['users','messages'],
    serverRoot: 'http://localhost:2403/', // optional, defaults to same server
    socketOptions: { reconnectionDelayMax: 3000 }, // optional socket io additional configuration
    useSocketIo: true, // optional, defaults to false
    noCache: true // optional, defaults to false (false means that caching is enabled, true means it disabled)
});


chatApp.config( function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise('/home');

  $stateProvider
      .state('home', {
        url: '/home',
        templateUrl: 'loginForm.html'
      })
      .state('register',{
          url: '/register',
          templateUrl: 'registerForm.html'
      })


      .state('chat', {
          url: '/chat',
          templateUrl: 'chat.html'
      });

});

    chatApp.service('messageService',['$q','dpd','$state' ,function ($q,dpd,$state) {
        this.getAllMesages = function () {
            var defer = $q.defer();
            dpd.messages.get().success(function (arr) {
               defer.resolve(arr);
            });
            return defer.promise;

        };

        this.sendMessage = function(msg,userid){

            dpd.messages.post({"text":msg ,"userID":userid})
                .success(function (result) {

                })
                .error(function (err) {
                    if(err) return console.log(err);
                })

        };


    }]);



chatApp.service('userService',['$rootScope','$q','$window','$timeout','dpd','$cookies','$state','$http'
                ,function ($rootScope,$q,$window,$timeout,dpd,$cookies,$state,$http){

        var user;

        //Function Get User Name And Password And Logs in
            this.logIn = function(userName,pass) {
                        $http.post('/users/login', {
                            username: userName,
                            password: pass
                                }).success(function (userSession) {

                                    $cookies.sid = userSession.id;
                                    $state.go('chat');

                                }).error(function (err) {
                                    return err.message;
                                });
            }
        //Function Gets Id Disconnects User
        this.disconnect= function (id){
            dpd.users.get('logout').success(function () {
                dpd.users.put(id,{"connected":false});
                $state.go('home');
            });
        };
        //Function Returns Promise With User
        this.checkIfConnected = function () {
            var defer = $q.defer();

            var user = dpd.users.get('me').success(function (user){
                if(user)
                {

                    defer.resolve(user);
                    $state.go('chat');
                    return defer.promise;

                }
                else{
                    $state.go('home');
                }

            });

            return user;
        }

        //Register User - returns true if success
        this.register = function(name,pass){
            var defer = $q.defer();
             dpd.users.post({"username":name ,"password":pass})
                .success(function (result) {
                    defer.resolve(true);

                })
                .error(function (err) {
                    defer.resolve(false);
                    if(err) return alert("name " + err.errors.username);
                });
            return defer.promise;

        };
 }]);






chatApp.controller('registerController' , function($scope,userService,$state) {
    //Go Back To Log In
    $scope.Back = function () {
        $state.go('home');
    }
    //Submit Register Form And Log In
    $scope.submit = function(username,password,password2){
        if(password != password2){
            return alert("password doesnt match");
        }
        userService.register(username,password).then(function (result){
            if(result == true){
                userService.logIn(username,password);
            }
        });


    };
});




chatApp.controller('chatController' ,['$rootScope','dpd','messageService','userService','$scope','$timeout',
    function($rootScope,dpd,messageService,userService,$scope,$timeout){

            $scope.user = " ";
            $scope.messages = [];

        //Checks If User Is Connected
      userService.checkIfConnected().then(function (result){
            $scope.user = result.data;

        });


            //Reset Messages
         messageService.getAllMesages().then(function (result) {
             $scope.messages =result;
         })


            //Check If User Connected
            $rootScope.$on('$stateChangeStart',
                function(event, toState, toParams, fromState, fromParams){
                    //Checks If User Is Connected
                    userService.checkIfConnected().then(function (result){
                        $scope.user = result.data;
                    });
                })

            //Function To Scroll Chat
            $scope.scrollChat = function () {
                var chat = document.getElementById('chat');
                $("#chat").animate({ scrollTop: chat.scrollHeight }, "slow");
            };
            //Scroll Chat On Init
            $timeout(function () {
                   $scope.scrollChat();
                },35);





            //Update Messages
        dpd.on($scope, "msgCreated", function (result) {

            messageService.getAllMesages().then(function (result) {
                $scope.messages =result;
            })
            $scope.scrollChat();

        });



            //Disconnect User
            $scope.disconnect = function(){

                userService.disconnect($scope.user.id);

            };



            //Send Message To Chat
            $scope.addMessage = function (msg) {

                messageService.sendMessage(msg,$scope.user.id);

            }


}]);


chatApp.controller('usersController',['$scope' ,'userService','$state',function($scope,userService,$state) {

    //Go To Register State
    $scope.register = function () {
        $state.go('register');
    }
    //Log In User
    $scope.logIn= function(userName,pass){
        userService.logIn(userName,pass);
    }


}]);
