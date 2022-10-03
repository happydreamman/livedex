import React, { useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import Sidebar from './GeneralComponents/Sidebar';
import ModalConnect from './GeneralComponents/ModalConnect';
import TopNav from './GeneralComponents/TopNav';
import { loadContract } from '../utils';
import { BigNumber } from "@0x/utils";
import { useToasts } from 'react-toast-notifications';
import { makeStyles } from '@mui/styles';
import { ERC20_ABI } from '../constants/abis/erc20';
import Main_bridge_abi from '../constants/abis/bridge_ethereum.json';
import Side_bridge_abi from '../constants/abis/bridge_sidechain.json';
import SelectBox from './GeneralComponents/BridgeSelectBox';
import Grid from '@mui/material/Grid';
import InputSample from './GeneralComponents/InputBox';
import ButtonBox from './GeneralComponents/ButtonBox';
import SearchTokenBox from './GeneralComponents/SearchTokenBox';
import SliderBox from './GeneralComponents/SliderBox';
import bridge_meta_data from '../constants/bridge_meta_data.json';
import _1inch_token_list from '../constants/1inch_token_list.json';
import bridge_tokens from '../constants/bridge_tokens.json';
import Dialog, { DialogProps } from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import { chainlist } from '../constants/chainlist';
import { chainport_url } from "../constants";

let token_list:any = bridge_tokens.tokens;
let tokens_ETH: any = []
let tokens_side: any = []
let interval: any;

function Bridge(props: any) {
  const isMobile = useMediaQuery('(max-width: 425px)');

  const { active, account, library, chainId } = useWeb3React();
  const [show, setShow] = useState(false);
  const [tokenlist, setTokenlist] = useState([]);
  const [network1, setNetwork1] = useState("1");
  const [network2, setNetwork2] = useState("56");
  const [token, setToken] = useState(null);
  const [rotate, setRotate] = useState(false);
  const [amount, setAmount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [decimals, setDecimals] = useState(0);
  const [approved_amount, setApproved_amount] = useState(0);
  const [isApprove, setIsApprove] = useState(false);
  const [gasLimit, setGasLimit] = useState(0);
  const [isAfterBurn, setIsAfterBurn] = useState(false);
  const [txhash, setTxhash] = useState("");
  const [open, setOpen] = React.useState(false);
  const [scroll, setScroll] = React.useState<DialogProps['scroll']>('paper');
  const [dense] = React.useState(false);
  const [secondary] = React.useState(true);
  const { addToast } = useToasts();

  const useStyles = makeStyles((theme) => ({
    content: {
      backgroundColor: "#00132f",
      backgroundSize: "100% 100%",
      textAlign: "center",
      border: "1px solid white",
      borderRadius: 20
    },
    header: {
      borderBottom: "1px solid rgb(26 43 68)",
      padding: "25px 0"
    },
    h_font_size: {
      fontSize: 25,
      margin: 0,
      fontWeight: "bold"
    },
    select_part: {
      padding: 30,
      borderBottom: "1px solid rgb(26 43 68)",
    },
    input_part: {
      padding: 30,
      paddingTop: 0
    },
    switch_btn: {
      height: "100%",
      display: "flex",
      alignItems: "end",
      justifyContent: "center",
    },
    connect_wallet: {
      borderRadius: 50,
      width: "100%",
      height: 60,
      backgroundColor: "grey",
      color: "White",
      border: "1px solid grey",
      fontWeight: "bold",
    },
    active_wallet: {
      borderRadius: 50,
      width: "100%",
      height: 60,
      backgroundColor: "rgb(47, 246, 211)",
      color: "black",
      border: "1px solid rgb(47, 246, 211)",
      fontWeight: "bold",
    },
    inactive_wallet: {
      borderRadius: 50,
      width: "100%",
      height: 60,
      backgroundColor: "#178481",
      color: "black",
      border: "1px solid #178481",
      fontWeight: "bold",
      cursor: "not-allowed"
    },
  }));

  const classes = useStyles();

  useEffect(() => {
    (async () => {
      token_list = (await (await fetch(`${chainport_url}`)).json())?.tokens
    })();
    interval = setInterval(async () => {
      token_list = (await (await fetch(`${chainport_url}`)).json())?.tokens
    }, 600000);
    if (localStorage.getItem('redeem')) {
      setIsAfterBurn(true);
    }
    return () => {
      interval = 0;
    }; 
  }, [])

  useEffect(() => {
    getTokenList(network1);
    switchChain(Number(network1))
    setToken(null);
    setAmount(0);
    if (network1 === network2) {
      let nets = ['250', '43114', '56', '122', '1', '1285', '137'];
      for (let i = 0; i < nets.length; i++) {
        if (network2 !== nets[i]) {
          setNetwork2(nets[i]);
          break;
        }
      }
    }
  }, [network1]);

  useEffect(() => {
    if (network1 === network2) {
      let nets = ['250', '43114', '56', '122', '1', '1285', '137'];
      for (let i = 0; i < nets.length; i++) {
        if (network1 !== nets[i]) {
          setNetwork1(nets[i]);
          break;
        }
      }
    }
  }, [network2]);

  // *** Switch Chain
  const switchChain = async (chain_id: number) => {
    const win:any = window;

    if (win.ethereum && chainId !== chain_id) {
      try {
        await win.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + chain_id.toString(16) }],
        })

        return true; 
      } catch (error) {
        let chainId_s = chain_id.toString(16)
          try {
            await win.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x' + chain_id.toString(16),
                  chainName: chainlist[chainId_s].chainName,
                  rpcUrls: [...chainlist[chainId_s].rpcUrls] /* ... */,
                  blockExplorerUrls: [...chainlist[chain_id].blockExplorerUrls] /* ... */,
                  nativeCurrency: {
                    name: chainlist[chain_id].nativeCurrency.name,
                    symbol: chainlist[chain_id].nativeCurrency.symbol, // 2-6 characters long
                    decimals: 18,
                  }
                },
              ],
            });
            return true;
          } catch (addError) {
            return false;
          }
        
        return false;
      }
    }
    return true; 
  }
  // ***

  const getTokenList = async (network: any) => {
    let tokens = token_list.filter(token => Number(token.chain_id) === Number(network) && !token.blacklisted_token);
    if (Number(network) === 1) {
      let _1inch_tokens:any = [];
      for (let key in _1inch_token_list.tokens) {
        let duplicate = tokens.find(t => t.web3_address === _1inch_token_list.tokens[key].address);
        if (!duplicate) {
          _1inch_tokens.push({
            web3_address: _1inch_token_list.tokens[key].address,
            decimals: _1inch_token_list.tokens[key].decimals,
            name: _1inch_token_list.tokens[key].name,
            symbol: _1inch_token_list.tokens[key].symbol,
            token_image: _1inch_token_list.tokens[key].logoURI,
            verified: false,
            liquidity_token: false,
          })
        }
      }
      tokens.push(..._1inch_tokens);
      if (tokens_ETH.length === 0) tokens_ETH =[...tokens];
    } else {
      tokens_side = [...tokens];
    }
    tokens.sort((a, b) => a.symbol.toLowerCase().charCodeAt(0) - b.symbol.toLowerCase().charCodeAt(0));
    console.log("tokens=>", tokens.slice(0, 200))
    if (tokens.length > 200) setTokenlist(tokens.slice(0, 200));
    else setTokenlist(tokens);
  }

  const reduceString = (str: string) => {
    if (isMobile) return str.slice(0, 5) + "...";
    else return str.slice(0, 5) + "..." + str.slice(str.length - 3, str.length)
  }

  const selectToken = async (t: any) => {
    setToken(t);
    setOpen(false);
    getTokenInfo(t);
  }

  const getTokenInfo = async (t: any) => {
    try {
      let token_contract = loadContract(library, ERC20_ABI, t.web3_address);
      let _balance = await token_contract.methods.balanceOf(account).call();
      let _decimals = await token_contract.methods.decimals().call();
      let _approved_amount = await token_contract.methods.allowance(account, bridge_meta_data.api_meta_info[chainlist[network1].chainSymbol].contract_address).call();
      setDecimals(_decimals);
      setBalance((_balance / 10**_decimals).toFixed(5));
      setApproved_amount(_approved_amount / 10**_decimals);
    } catch (err) {}
  } 

  const directURL = (address: any) => {
    switch(String(network1)) {
      case "1":
        return `https://etherscan.io/token/${address}`
        break;
      case "250":
        return `https://ftmscan.com/token/${address}`
        break;
      case "43114":
        return `https://explorer.avax.network/token/${address}`
        break;
      case "56":
        return `https://bscscan.com/token/${address}`
        break;
      case "122":
        return `https://explorer.fuse.io/token/${address}`
        break;
      case "1285":
        return `https://moonriver.moonscan.io/token/${address}`
        break;
      default:
        return `https://polygonscan.com/token/${address}`
        break;
    }
  }

  const searchToken = (str: any) => {
    if (Number(network1) === 1) {
      let searchedTokens = tokens_ETH.filter(token => token.name.toLowerCase().includes(str.toLowerCase()) || 
          token.symbol.toLowerCase().includes(str.toLowerCase()) || 
          token.web3_address.includes(str.toLowerCase()))
      if (searchedTokens.length > 200) setTokenlist(searchedTokens.slice(0, 200));
      else setTokenlist(searchedTokens);
    } else {
      let searchedTokens = tokens_side.filter(token => token.name.toLowerCase().includes(str.toLowerCase()) || 
      token.symbol.toLowerCase().includes(str.toLowerCase()) || 
      token.web3_address.includes(str.toLowerCase()))
      setTokenlist(searchedTokens);
    }
  }

  const switchNetwork = () => {
    setRotate(true);
    setTimeout(() => setRotate(false), 500)
    let temp = network1;
    setNetwork1(network2);
    setNetwork2(temp);
    setToken(null);
    setAmount(0);
  }

  const approveToken = async () => {
    let result = await switchChain(Number(network1))
    if (!result) {
      return
    };
    try {
      let options: any;
      if (network1 === "1") options = { from: account, gasPrice: gasLimit * 10**9 }
      else options = { from: account }
      setIsApprove(true);
      let token_contract = loadContract(library, ERC20_ABI, token.web3_address);
      let fromAmount = new BigNumber(amount).times(10 ** decimals);

      token_contract.methods.approve(bridge_meta_data.api_meta_info[chainlist[network1].chainSymbol].contract_address, fromAmount.toString()).send(options)
        .on('receipt', async (receipt) => {
          setIsApprove(false);
          addToast("Transaction Confirmed", {
            appearance: 'success',
            autoDismiss: true,
          })
          setApproved_amount(amount);
        }).on('transactionHash', (hash) => {
          addToast("Transaction Created : " + hash, {
            appearance: 'success',
            autoDismiss: true,
          })
        }).on('error', (err) => {
          setIsApprove(false);
          addToast('Transaction Failed', {
            appearance: 'error',
            autoDismiss: true,
          })
        }).then((resp) => console.log(resp))
    } catch (e) {
      setIsApprove(false);
    }
  }

  const portTokens = async () => {
    let result = await switchChain(Number(network1))
    if (!result) {
      return
    };
    try {
      let options: any;
      if (network1 === "1") options = { from: account, gasPrice: gasLimit * 10**9 }
      else options = { from: account }
      setIsApprove(true);
      if (network1 === "1") {
        let bridge_contract = loadContract(library, Main_bridge_abi, bridge_meta_data.api_meta_info[chainlist[network1].chainSymbol].contract_address);
        let fromAmount = new BigNumber(amount).times(10 ** decimals);
        bridge_contract.methods.depositTokens(token.web3_address, fromAmount.toString(), bridge_meta_data.api_meta_info[chainlist[network2].chainSymbol].cp_network_id).send(options)
          .on('receipt', (receipt) => {
            setIsApprove(false);
            addToast("Transaction Confirmed", {
              appearance: 'success',
              autoDismiss: true,
            })
            setBalance((balance - amount).toFixed(5));
            setAmount(0)
          }).on('transactionHash', (hash) => {
            addToast("Transaction Created : " + hash, {
              appearance: 'success',
              autoDismiss: true,
            })
          }).on('error', (err) => {
            setIsApprove(false);
            addToast('Transaction Failed', {
              appearance: 'error',
              autoDismiss: true,
            })
          }).then((resp) => console.log(resp))

      } else if (network2 === "1") {
        let bridge_contract = loadContract(library, Side_bridge_abi, bridge_meta_data.api_meta_info[chainlist[network1].chainSymbol].contract_address);
        let fromAmount = new BigNumber(amount).times(10 ** decimals);
        bridge_contract.methods.burnTokens(token.web3_address, fromAmount.toString()).send(options)
          .on('receipt', (receipt) => {
            console.log(receipt);
            setIsApprove(false);
            addToast("Transaction Confirmed", {
              appearance: 'success',
              autoDismiss: true,
            })
            setBalance((balance - amount).toFixed(5));
            setIsAfterBurn(true);
            setTxhash(receipt.transactionHash)
          }).on('transactionHash', (hash) => {
            addToast("Transaction Created : " + hash, {
              appearance: 'success',
              autoDismiss: true,
            })
          }).on('error', (err) => {
            setIsApprove(false);
            addToast('Transaction Failed', {
              appearance: 'error',
              autoDismiss: true,
            })
          }).then((resp) => console.log(resp))
      } else {
        let bridge_contract = loadContract(library, Side_bridge_abi, bridge_meta_data.api_meta_info[chainlist[network1].chainSymbol].contract_address);
        let fromAmount = new BigNumber(amount).times(10 ** decimals);
        bridge_contract.methods.crossChainTransfer(token.web3_address, fromAmount.toString(), bridge_meta_data.api_meta_info[chainlist[network2].chainSymbol].cp_network_id).send(options)
          .on('receipt', (receipt) => {
            setIsApprove(false);
            addToast("Transaction Confirmed", {
              appearance: 'success',
              autoDismiss: true,
            })
            setBalance((balance - amount).toFixed(5));
            setAmount(0)
          }).on('transactionHash', (hash) => {
            addToast("Transaction Created : " + hash, {
              appearance: 'success',
              autoDismiss: true,
            })
          }).on('error', (err) => {
            setIsApprove(false);
            addToast('Transaction Failed', {
              appearance: 'error',
              autoDismiss: true,
            })
          }).then((resp) => console.log(resp))
      }
    } catch (e) {
      setIsApprove(false);
    }
  }

  const releaseToken = async () => {
    let redeemStatus: any;
    if (localStorage.getItem('redeem')) {
      redeemStatus = JSON.parse(localStorage.getItem('redeem'));
    } else {
      redeemStatus = (await (await fetch(`https://api.chainport.io/api/redeem?base_tx_hash=${txhash}&base_network_id=${bridge_meta_data.api_meta_info[chainlist[network1].chainSymbol].cp_network_id}`)).json())
    }

    let options: any;
    options = { from: account, gasPrice: gasLimit * 10**9 }
    setIsApprove(true);

    let bridge_contract = loadContract(library, Main_bridge_abi, bridge_meta_data.api_meta_info["ETHEREUM"].contract_address);
  
    if (redeemStatus.redeem.validator_signature !== undefined) {
      localStorage.setItem('redeem', JSON.stringify(redeemStatus));
      if (token) localStorage.setItem('token', JSON.stringify(token));
      bridge_contract.methods.releaseTokens(redeemStatus.redeem.validator_signature, redeemStatus.redeem.target_token_address, redeemStatus.redeem.amount, redeemStatus.redeem.validator_nonce).send(options)
        .on('receipt', (receipt) => {
          setIsApprove(false);
          addToast("Transaction Confirmed", {
            appearance: 'success',
            autoDismiss: true,
          })
          setIsAfterBurn(false);
          setAmount(0)
          localStorage.removeItem('redeem')
        }).on('transactionHash', (hash) => {
          addToast("Transaction Created : " + hash, {
            appearance: 'success',
            autoDismiss: true,
          })
        }).on('error', (err) => {
          setIsApprove(false);
          addToast('Transaction Failed', {
            appearance: 'error',
            autoDismiss: true,
          })
        }).then((resp) => console.log(resp))
    } else {
      setIsApprove(false);
    }
  }

  // *** Just Copy from MUI
    const handleClickOpen = (scrollType: DialogProps['scroll']) => () => {
      setOpen(true);
      setScroll(scrollType);
    };

    const handleClose = () => {
      setOpen(false);
      getTokenList(network1);
    };

    const descriptionElementRef = React.useRef<HTMLElement>(null);
    React.useEffect(() => {
      if (open) {
        const { current: descriptionElement } = descriptionElementRef;
        if (descriptionElement !== null) {
          descriptionElement.focus();
        }
      }
    }, [open]);
  // *** END Just Copy from MUI

  let BeforeBurn = (
    token && Number(amount) !== 0 ? 
      (
        Number(approved_amount) >= Number(amount) ?
          <button className={isApprove?classes.inactive_wallet: classes.active_wallet} onClick={portTokens} disabled={isApprove}>
            {
              isApprove 
              && 
              <img src="assets/icons/spinner.gif" alt="" width="20" className="mr-3" />
            }
            Port Tokens
          </button>
          :
          <button className={isApprove?classes.inactive_wallet: classes.active_wallet} onClick={approveToken} disabled={isApprove}>
            {
              isApprove 
              && 
              <img src="assets/icons/spinner.gif" alt="" width="20" className="mr-3" />
            }
            Approve Token
          </button>
      )
      
      :
      <button className={classes.inactive_wallet} onClick={() => { setShow(!show) }} disabled>Choose Token and Amount</button>
  )


  let AfterBurn = (
    Number(chainId) === 1 ?
      <button className={isApprove?classes.inactive_wallet: classes.active_wallet} onClick={releaseToken} disabled={isApprove}>
        {
          isApprove 
          && 
          <img src="assets/icons/spinner.gif" alt="" width="20" className="mr-3" />
        }
        Release Token
      </button>
      :
      <button className={classes.connect_wallet} onClick={() => { switchChain(1) }} >Switch your Wallet Chain to Ethereum Mainnet</button>
  )


  const html =
    <div id="page-content-wrapper">
      <TopNav show={[show, setShow]} />
      <div className="right-side">
        <div className="container-fluid" style={{minHeight: "calc(100vh - 146px)"}}>
          <div className="row mt-4">
            <h1>Bridge</h1>
            <p>Get the best price on different exchanges</p>
          </div>

          <Grid container className="mt-4">
            <Grid item lg={3} md={12} sm={12} xs={12}>
            </Grid>
            <Grid item lg={6} md={12} sm={12} xs={12}>
              <div className={classes.content}>
                <div className={classes.header}>
                  <p className={classes.h_font_size}>{isAfterBurn? "Port In" : "ChainPort"}</p>
                </div>

                {
                  isAfterBurn ? 
                  <div className="p-3 mt-3">
                    <img src="assets/icons/bridge/frombsctoeth.jpg" alt="" width="80%" />
                  </div>
                  :
                  <>
                    <div className={classes.select_part}>
                      <Grid container className="m-0 p-0">
                        <Grid item lg={5} md={5} sm={5} xs={12} className="m-0 p-0 text-left position-relative">
                          <label htmlFor="" className="">From</label>
                          <SelectBox 
                            value={network1}
                            setNetwork={setNetwork1}
                            />
                        </Grid>
                        <Grid item lg={2} md={2} sm={2} xs={12} className="m-0 p-0">
                          <div className={classes.switch_btn}>
                            <img 
                              src="assets/icons/bridge/switch.png" 
                              alt="" 
                              width="45" 
                              className={rotate ? "mt-4 rotateimg180": "mt-4 pointer"}
                              onClick={switchNetwork} />
                          </div>
                        </Grid>
                        <Grid item lg={5} md={5} sm={5} xs={12} className="m-0 p-0 text-left position-relative">
                          <label htmlFor="">To</label>
                          <SelectBox 
                            value={network2}
                            setNetwork={setNetwork2} 
                            />
                        </Grid>
                      </Grid>
                    </div>

                    <div className={classes.input_part}>
                      <Grid container className="m-0 p-0">
                        <Grid item lg={5} md={5} sm={5} xs={12} className="m-0 p-0 text-left pt-4">
                          <label htmlFor="" className="">Select a Token</label>
                          <ButtonBox 
                            handleClickOpen={handleClickOpen}
                            token={token} />
                        </Grid>
                        <Grid item lg={2} md={2} sm={2} xs={12} className="m-0 p-0">
                          
                        </Grid>
                        <Grid item lg={5} md={5} sm={5} xs={12} className="m-0 p-0 text-left pt-4">
                          <label htmlFor="">
                            {
                              token ? 
                                "Balance(" + balance + ")"
                                :
                                "Enter Amount to Port"
                            }
                          </label>
                          <InputSample 
                            setAmount={setAmount}
                            value={amount}
                            balance={balance} />
                        </Grid>
                      </Grid>
                    </div>
                  </>
                }

                {
                  (network1 === "1" || isAfterBurn) &&
                  <div className="px-4">
                    <SliderBox setGasLimit={setGasLimit} />
                  </div>
                }

                {
                  isAfterBurn && 
                  (
                    JSON.parse(localStorage.getItem("redeem")) && JSON.parse(localStorage.getItem("token")) ?
                      <h3 className="release-amount">{JSON.parse(localStorage.getItem("redeem")).redeem.amount / 10**JSON.parse(localStorage.getItem("token"))?.decimals} {JSON.parse(localStorage.getItem("token"))?.symbol}</h3>
                      :
                      <h3 className="release-amount">{amount} {token.symbol}</h3>
                  )
                }

                <div className="p-4">
                  { !active ?
                    <button className={classes.connect_wallet} onClick={() => { setShow(!show) }}>Connect Wallet</button>
                    :
                    (
                      isAfterBurn ?  AfterBurn : BeforeBurn
                    )
                  }
                  <br />
                  <br />
                  <br />
                  <p>&#9830; Porting of tokens can take up to 10 minutes, depending on network traffic. For further information visit <a href="https://app.chainport.io/my-activity" target="_blank">HERE</a></p>
                </div>

              </div>
            </Grid>
            <Grid item lg={3} md={12} sm={12} xs={12}>
            </Grid>
          </Grid>

        </div>

        <div className="mt-3 footer-mt-5">
          <footer>
            <p className="text-center text-white">
              <a href="" className="text-white"><small>Terms &amp; Condition</small></a> | <a href="" className="text-white"><small>Privacy Policy</small></a>
              <br />
              <small>© 2021 ABC Token</small>
            </p>
          </footer>
        </div>
      </div>

      {/*Dialog*/}
        <Dialog
            open={open}
            onClose={handleClose}
            scroll={scroll}
            maxWidth="lg"
            aria-labelledby="scroll-dialog-title"
            aria-describedby="scroll-dialog-description"
            className="custom-dialog"
          >
            <DialogTitle 
              id="scroll-dialog-title" 
              className="text-light text-center"
              sx={{ borderBottom: "1px solid #292929" }}
              >Select a Token </DialogTitle>
            <DialogTitle 
              className="text-light text-center"
              sx={{ borderBottom: "1px solid #292929" }}
              >
              <SearchTokenBox searchToken={searchToken} />
            </DialogTitle>
            <DialogContent dividers={scroll === 'paper'} sx={{p: 0}}>
                <List dense={dense}>
                  {tokenlist.map((token, i) => (
                    <ListItem key={i}
                      secondaryAction={
                        <a 
                          href={directURL(token.web3_address)} 
                          className="text-light"
                          target="_blank"
                        >
                          {reduceString(token.web3_address)}
                        </a>
                      }
                      onClick={() => selectToken(token)}
                      >
                      <ListItemAvatar>
                        <img src={token.token_image} alt="" width="45px" height="45px" className="rounded-circle bg-icon" />
                      </ListItemAvatar>
                      <ListItemText
                        className="text-light"
                        primary={token.symbol}
                        secondary={secondary ? (isMobile ? reduceString(token.name) : token.name) : null}
                      />
                    </ListItem>
                  ))}
                </List>
            </DialogContent>
          </Dialog>
        {/*End Dialog*/}
    </div>

  return (
    <div className="d-flex" id="wrapper">
      <Sidebar current={props.current} />
      {html}
      <ModalConnect show={show} setShow={setShow} />
    </div>
  )

}

export default Bridge;